const messenger = require('facebook-chat-api');
const creds = require('./credentials.json');

function sendMessenger(content, id) {
    console.log('Sending message via messenger 📪');
    messenger(
        { email: creds.fbMail, password: creds.fbPassword },
        (err, api) => {
            if (err) return console.log('Facebook login failed ⚡️', err);

            try {
                api.getFriendsList((err, data) => {
                    if (err) return console.error(err);

                    console.log(data.length);
                });
            } catch (err) {
                console.log('💩', err);
            }

            api.getUserID('Kuba Kaczmarek', (err, data) => {
                if (err) return console.error(err);

                console.log(data);
            });

            api.sendMessage(content, id, (err, succ) => {
                if (err) return console.log('Sending failed ', err);
                else console.log('Message sent: ', succ);
            });
        },
    );
}

sendMessenger({ body: 'Hi' }, 'kuba.kaczmarek.5070');
