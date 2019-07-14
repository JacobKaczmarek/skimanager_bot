const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const creds = require('./credentials.json');
const fs = require('fs');

const accountSid = creds.accountSid;
const authToken = creds.authToken;
const client = require('twilio')(accountSid, authToken);

class Bot {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async loadBrowser() {
        try {
            this.browser = await puppeteer.launch();
            this.page = await this.browser.newPage();
        } catch (err) {
            console.log('Initialisation failed 🌩', err);
        }
    }

    async login(mail, password) {
        await this.page.evaluate(mail => {
            document.querySelector('#LoginForm_email').value = mail;
        }, mail);
        await this.page.evaluate(
            password =>
                (document.querySelector(
                    '#LoginForm_password',
                ).value = password),
            password,
        );
        await this.page.evaluate(() =>
            document.querySelector('input.btn').click(),
        );

        await this.page.waitForNavigation();
        // Check if login was succesfull
        if (
            (await this.page.evaluate(() =>
                document.querySelector('.calendar-mobile-relative'),
            )) != null
        ) {
            console.log('Login successfull 🔓');
            return true;
        } else {
            console.log('Login failed ⛔️');
            return false;
        }
    }

    async getLessons() {
        // await this.page.waitForNavigation();
        return await this.page.evaluate(() => {
            return Array.from(
                document.querySelectorAll('.calendar-mobile-box '),
            ).map(lesson => ({
                time: lesson.querySelector('.text-muted').textContent.trim(),
                student: lesson
                    .querySelector('div > span > a')
                    .textContent.trim(),
            }));
        });
    }

    async nextDay() {
        await this.page.waitForNavigation();
        await this.page.evaluate(() => {
            document.querySelector('i.fa-arrow-right').click();
        });
    }

    compareLessons(lessons) {
        let old = JSON.parse(fs.readFileSync('lessons.json'));
        let message = null;

        if (old.date == new Date().getDate()) {
            if (old.lessons.length < lessons.length) {
                let newLessons = lessons.filter(
                    lesson => !old.lessons.includes(lesson),
                );
                message = 'New lesson(s): \n';
                newLessons.forEach(
                    lesson =>
                        (message += `At ${lesson.time} with ${
                            lesson.student
                        }\n`),
                );
            } else if (old.lessons.length > lessons.length) {
                let removedLessons = old.lessons.filter(
                    lesson => !lessons.includes(lesson),
                );
                message = 'Lesson(s) canceled ';
                removedLessons.forEach(
                    lesson =>
                        (message += `At ${lesson.time} with ${
                            lesson.student
                        }\n`),
                );
            }
        } else {
            message = `You have ${lessons.length} lesson(s) today\n`;
            lessons.forEach(lesson => {
                message += `At ${lesson.time} with ${lesson.student}\n`;
            });
        }
        if (message != null) {
            this.saveData(lessons);
            this.sendSms(message, creds.phone);
            this.sendMail(message, creds.email);
        }
    }

    saveData(lessons) {
        let data = JSON.stringify({
            date: new Date().getDate(),
            lessons: lessons,
        });
        fs.writeFile('./lessons.json', data, err => {
            if (err) throw err;
        });
    }

    async goto(url) {
        try {
            await this.page.goto(url);
        } catch (err) {
            console.log('No interrnet connection ⚡️');
            process.exit();
        }
    }

    async close() {
        await this.browser.close();
    }

    async sendMail(content, email) {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'skimanagerbot@gmail.com',
                pass: 'Skimanager123',
            },
        });

        let mailOptions = {
            from: 'skimanagerbot@gmail.com',
            to: email,
            subject: 'Skimanager bot',
            text: content,
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) throw err;
            else console.log('Mail sent ✉️');
        });
    }

    async sendSms(content, phoneNumber) {
        console.log(`Sending message to ${phoneNumber}`);
        client.messages
            .create({
                from: 'whatsapp:+14155238886',
                body: content,
                to: `whatsapp:${phoneNumber}`,
            })
            .then(() => console.log('Message sent 📱'))
            .catch(err => console.log('Sending failed 🔥', err));
    }
}
setInterval(async () => {
    const bot = new Bot();
    await bot.loadBrowser();
    await bot.goto('https://surfpoint.skimanager.pl/');
    if (await bot.login(creds.email, creds.password)) {
        let lessons = await bot.getLessons();
        await bot.compareLessons(lessons);
        console.log('Done 🌈');
    }
    await bot.close();
}, 1000 * 30);
