const { Presence } = require('../models/presence.model');

const joinChannel = async (userId, channelId) => {
    await Presence.updateOne(
        { userId },
        { $addToSet: { channels: channelId } },
    );
};

const leaveChannel = async (userId, channelId) => {
    await Presence.updateOne(
        { userId },
        { $pull: { channels: channelId } },
    );
};

const getOnlineUsersInChannel = async (channelId) => {
    return Presence.find({ channels: channelId }).lean();
};

module.exports = { joinChannel, leaveChannel, getOnlineUsersInChannel };
