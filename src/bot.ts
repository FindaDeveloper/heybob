import config from './config';
import BurritoStore from './store/BurritoStore';
import LocalStore from './store/LocalStore';
import { parseMessage } from './lib/parseMessage';
import { validBotMention, validMessage } from './lib/validator';
import Rtm from './slack/Rtm';
import Wbc from './slack/Wbc';

const {
    enableDecrement,
    dailyCap,
    dailyDecCap,
    emojiInc,
    emojiDec,
    disableEmojiDec,
} = config.slack;

interface Emojis {
    type: string;
    emoji: string;
}

interface Updates {
    username: string;
    type: string;
}
const emojis: Array<Emojis> = [];

const incEmojis = emojiInc.split(',').map((emoji => emoji.trim()));
incEmojis.forEach((emoji: string) => emojis.push({ type: 'inc', emoji }));

if (!disableEmojiDec) {
    const decEmojis = emojiDec.split(',').map((emoji => emoji.trim()));
    decEmojis.forEach((emoji: string) => emojis.push({ type: 'dec', emoji }));
}

const giveBurritos = async (giver: string, updates: Updates[]) => {
    return updates.reduce(async (prev: any, burrito) => {
        return prev.then(async () => {
            if (burrito.type === 'inc') {
                await BurritoStore.giveBurrito(burrito.username, giver);
            } else if (burrito.type === 'dec') {
                await BurritoStore.takeAwayBurrito(burrito.username, giver);
            }
        });
    }, Promise.resolve());
};

const notifyUser = (user: string, message: string) => Wbc.sendDM(user, message);

const handleRices = async (giver: string, updates: Updates[]) => {
    const givenRices = await BurritoStore.givenToday(giver, 'from', 'inc');
    const diffInc = dailyCap - givenRices;

    const userNames = [...new Set(updates.map((e) => e.username))];
    const joinedUserNames = userNames.map((e) => `<@${e}>`).join(', ');

    if (updates.length) {
        if (updates.length > diffInc) {
            if (userNames.length == 1) {
                notifyUser(giver, `<@${giver}>님에게 :rice:을 보내려고 했지만, 오늘은 :rice:이 하나도 남지 않았어요 ㅠㅠ :sob:`);
            } else {
                notifyUser(giver, `${joinedUserNames} 님에게 :rice:을 보내려고 했지만, 오늘은 :rice:이 ${diffInc}밖에 남지 않았어요 ㅠㅠ :sob:`);
            }
        } else {
            userNames.forEach((name) => {
                notifyUser(giver, `<@${giver}>님이 :rice:을 보내셨습니다!!`); // TODO giver -> name
            });

            if (userNames.length == 1) {
                notifyUser(giver, `<@${userNames[0]}>님에게 :rice:을 보냈습니다!`);
            } else {
                notifyUser(giver, `${joinedUserNames} 님에게 :rice:을 보냈습니다!`);
            }
            
            await giveBurritos(giver, updates);
        }
    }
    return true;
};

const start = () => {
    Rtm.on('slackMessage', async (event: any) => {
        if (validMessage(event, emojis, LocalStore.getAllBots())) {
            if (validBotMention(event, LocalStore.botUserID())) {
                // Geather data and send back to user
            } else {
                const result = parseMessage(event, emojis);
                if (result) {
                    const { giver, updates } = result;
                    if (updates.length) {
                        await handleRices(giver, updates);
                    }
                }
            }
        }
    });
};

export {
    handleRices,
    notifyUser,
    start,
};
