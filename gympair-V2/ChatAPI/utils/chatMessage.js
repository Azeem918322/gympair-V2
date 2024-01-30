const moment = require('moment');

const formatMessage = (data) => {
    msg = {
        from:data.sender,
        senderId:data.sender,
        to:data.receiver,
        message:data.message,
        date: moment().format("YYYY-MM-DD"),
        time: moment().format("hh:mm a")
    }
    return msg;
}
module.exports=formatMessage;