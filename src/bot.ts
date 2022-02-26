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
    const givenRices = await BurritoStore.givenThisMonth(giver, 'from');
    console.log(`givenRices = ${givenRices}`);
    const diffInc = dailyCap - givenRices;
    console.log(`diffInc = ${diffInc}`);

    const userNames = [...new Set(updates.map((e) => e.username))];

    if (userNames.length > 1) {
        notifyUser(giver, `죄송하지만 한번에 한분까지만 :coffee:를 보낼 수 있어요 :sob: \n메세지를 삭제한 후 다시 시도해주세요!`);
        return;
    }

    const joinedUserNames = userNames.map((e) => `<@${e}>`).join(', ');

    if (updates.length) {
        if (updates.length > diffInc) {
            if (userNames.length == 1) {
                notifyUser(giver, `<@${userNames[0]}>님에게 :coffee:를 보내려고 했지만, 이번달엔 :coffee:가 하나도 남지 않았어요 ㅠㅠ :sob:`);
            } else {
                notifyUser(giver, `${joinedUserNames} 님에게 :coffee:를 보내려고 했지만, 이번달엔 :coffee:가 ${diffInc}밖에 남지 않았어요 ㅠㅠ :sob:`);
            }
        } else {
            const alreadySentUserNames = [];
            for (const name of userNames) {
                const stats = await BurritoStore.getUserStats(name, 'thismonth');
                
                console.log(`stats: ${JSON.stringify(stats)}`);

                const sameGiverStatsToday = stats.receivedFindToday.filter(e => e.from == giver);
                if (sameGiverStatsToday.length > 0) {
                    notifyUser(giver, `오늘은 이미 <@${name}>님에게 :coffee:를 보내셨습니다!`);
                    alreadySentUserNames.push(name);
                } else {
                    notifyUser(name, `<@${giver}>님이 :coffee:를 보내셨습니다!!`); 
                }
            }

            const finalGivesUserNames = userNames.filter(e => !alreadySentUserNames.includes(e));
            const joinedFinalGivesUserNames = finalGivesUserNames.map((e) => `<@${e}>`).join(', ');

            if (finalGivesUserNames.length == 0) {
                return false;
            } else if (finalGivesUserNames.length == 1) {
                notifyUser(giver, `<@${finalGivesUserNames[0]}>님에게 :coffee:를 보냈습니다!`);
            } else {
                notifyUser(giver, `${joinedFinalGivesUserNames} 님에게 :coffee:를 보냈습니다!`);
            }

            const finalUpdates = updates.filter(e => finalGivesUserNames.includes(e.username));
            await giveBurritos(giver, finalUpdates);
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
