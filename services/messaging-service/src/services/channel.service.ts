import { Presence, IPresence } from '../models/presence.model';

export const joinChannel = async (userId: string, channelId: string): Promise<void> => {
    await Presence.updateOne(
        { userId },
        { $addToSet: { channels: channelId } },
    );
};

export const leaveChannel = async (userId: string, channelId: string): Promise<void> => {
    await Presence.updateOne(
        { userId },
        { $pull: { channels: channelId } },
    );
};

export const getOnlineUsersInChannel = async (channelId: string): Promise<IPresence[]> => {
    return Presence.find({ channels: channelId }).lean<IPresence[]>();
};
