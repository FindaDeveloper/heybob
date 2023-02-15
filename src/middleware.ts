import config from './config';
import mapper from './lib/mapper';
import {sort} from './lib/utils';
import BurritoStore, {DatabasePost} from './store/BurritoStore';
import * as log from 'bog';
import LocalStore from "./store/LocalStore";
import {WbcParsed} from "./slack/Wbc";


const {
    enableLevel,
    scoreRotation,
} = config.level;

/**
 * Middleware for API and Websocket
 */

/**
 * @param {string} scoretype - inc / dec
 * @param {string} listType - to / from
 * @param {string} timesType - thismonth / pastmonth / every
 */
const getScoreBoard = async (listType: string, scoreType: string, timesType: string) => {
    const data = await BurritoStore.getScoreBoard({listType, scoreType, timesType});
    const score = [];
    const uniqueUsername = [...new Set(data.map((x) => x[listType]))];

    const scoreTypeFilter = (scoreType === 'inc') ? 1 : -1;
    uniqueUsername.forEach((u) => {
        const dataByUser = data.filter((e: any) => (e[listType] === u));
        let filteredData: any;
        let countSwitch: any;

        if (listType === 'to' && config.slack.enableDecrement && (scoreType === 'inc')) {
            filteredData = dataByUser;
        } else {
            filteredData = dataByUser.filter((e: any) => (e.value === scoreTypeFilter));
            countSwitch = 1;
        }
        const red = filteredData.reduce((a: number, item) => a + (countSwitch || item.value), 0);
        score.push({_id: u, score: red});
    });
    const scoreList = score.map((x) => {
        if (x.score !== 0) return x;
        return undefined;
    }).filter((y) => y);

    if (enableLevel) {
        const levelScoreList = scoreList.map(x => {
            let score = x.score;
            const roundedScore = Math.floor(score / scoreRotation) * scoreRotation;
            const level = Math.floor((score - 1) / scoreRotation);
            const newScore = ((score - roundedScore) === 0 ? roundedScore - (score - scoreRotation) : score - roundedScore);
            return {
                _id: x._id,
                score: newScore,
                level,
            }
        });
        return sort(mapper(levelScoreList));
    }

    return sort(mapper(scoreList));
};

const getStatistic = async () => {
    const listType = 'to';
    const scoreType = 'inc';
    const timesType = 'every';

    const databasePostsList = await BurritoStore.getScoreBoard({listType, scoreType, timesType});

    const idMap: Map<String, DatabasePost[]> = new Map();

    for (const post of databasePostsList) {
        if (!idMap.has(post.from)) {
            idMap.set(post.from, []);
        }
        idMap.get(post.from).push(post);
    }

    const slackUsers: WbcParsed[] = LocalStore.getSlackUsers();
    const result: Statistic[] = [];
    idMap.forEach((value, from, map) => {
        const user: WbcParsed | undefined = slackUsers.find((value) => value.id == from);
        value.forEach((post: DatabasePost) => {
            const toUser = slackUsers.find((value) => value.id == post.to);
            result.push({
                보낸사람이름: user?.name,
                받는사람: toUser?.name,
                시간: post?.given_at,
                받는사람번호: toUser?.phone,
                받는사람이메일: toUser?.email,
                이모지: post.emoji,
            })
        });
    })

    return convertToCSV(result);
};

interface Statistic {

    보낸사람이름: string | undefined;

    받는사람: string | undefined;

    시간: Date | undefined;

    받는사람번호: string | undefined;

    받는사람이메일: string | undefined;

    이모지: string;
}

function convertToCSV(data) {
    const separator = ',';
    const keys = Object.keys(data[0]);
    const csv = [keys.join(separator)];
    for (const item of data) {
        const values = keys.map(key => item[key]);
        csv.push(values.join(separator));
    }
    return csv.join('\n');
}

const _getUserScoreBoard = async ({...args}) => {
    const {listType} = args;
    const data: any = await BurritoStore.getScoreBoard({...args});
    const score = [];
    const uniqueUsername = [...new Set(data.map((x) => x[listType]))];
    uniqueUsername.forEach((u) => {
        const dataByUser = data.filter((e: any) => e[listType] === u);
        const scoreinc = dataByUser.filter((x: any) => x.value === 1);
        const scoredec = dataByUser.filter((x: any) => x.value === -1);
        score.push({
            _id: u,
            scoreinc: scoreinc.length,
            scoredec: scoredec.length,
        });
    });
    return score;
};

/**
 * @param {string} user - Slack userId
 */
const getUserStats = async (user: string, timesType: string) => {
    const [
        userStats,
        givenList,
        receivedList,
        givenListToday,
        receivedListToday,
    ] = await Promise.all([
        BurritoStore.getUserStats(user, timesType),
        _getUserScoreBoard({user, listType: 'to', timesType}),
        _getUserScoreBoard({user, listType: 'from', timesType}),
        _getUserScoreBoard({user, listType: 'to', today: true}),
        _getUserScoreBoard({user, listType: 'from', today: true}),
    ]);

    return {
        user: mapper([userStats])[0],
        given: sort(mapper(givenList)),
        received: sort(mapper(receivedList)),
        givenToday: sort(mapper(givenListToday)),
        receivedToday: sort(mapper(receivedListToday)),
    };
};

/**
 * @param {string} user - Slack userId
 */
const givenBurritosToday = async (user: string) => {
    const [
        receivedToday,
        givenToday,
    ] = await Promise.all([
        BurritoStore.givenBurritosToday(user, 'to'),
        BurritoStore.givenBurritosToday(user, 'from'),
    ]);

    return {
        givenToday,
        receivedToday,
    };
};

/**
 * @param {string} user - Slack userId
 */
const getUserScore = async (user: string, listType: string, scoreType: string, timesType: string) => {
    const scoreList = await BurritoStore.getScoreBoard({listType, scoreType, timesType});
    const userScore = scoreList.filter((x) => x[listType] === user);

    const scoreTypeFilter = (scoreType === 'inc') ? 1 : -1;
    let countSwitch: any;
    let filteredData: any;

    if (listType === 'to' && scoreType === 'inc') {
        if (config.slack.enableDecrement) {
            filteredData = userScore;
        } else {
            filteredData = userScore.filter((e: any) => (e.value === scoreTypeFilter));
            countSwitch = 1;
        }
    } else {
        filteredData = userScore.filter((e: any) => (e.value === scoreTypeFilter));
        if (scoreType === 'dec') {
            countSwitch = 1;
        }
    }
    const userScoreCounted = filteredData.reduce((acc, item) => acc + (countSwitch || item.value), 0);
    const [res] = mapper([{
        _id: user,
        score: userScoreCounted,
    }]);
    return {
        ...res,
        scoreType,
        listType,
    };
};

export {
    getScoreBoard,
    getUserStats,
    givenBurritosToday,
    getUserScore,
    getStatistic
};
