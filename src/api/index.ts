import log from 'bog';
import Route from './Route';
import {getScoreBoard, getUserStats, givenBurritosToday, getUserScore} from '../middleware';
import config from '../config';

// Types
import Http from '../types/Http';

// defaults
const apiPath: string = config.http.api_path;

const ALLOWED_LISTTYPES: string[] = [
    'to',
    'from',
];

const ALLOWED_SCORETYPES: string[] = [
    'inc',
    'dec',
];

const ALLOWED_TIMES: string[] = [
    'thismonth',
    'pastmonth',
    'every'
]

/**
 * http response function
 * @param { object } content
 * @param { object } res
 * @params { number } statuscode
 */
const response = (content: Http.Response, res: any, statusCode: number = 200): void => {
    res.writeHead(statusCode, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(content), 'utf-8');
};

const csvResponse = (content: string, res: any, statusCode: number = 200): void => {
    res.writeHead(statusCode, {'Content-Type': 'text/csv'});
    res.end(content, 'utf-8');
};

Route.add({
    method: 'GET',
    path: `${apiPath}userstats/today/{user}`,
    handler: async (request: any, res: any) => {
        try {
            const {user} = request.params;
            if (!user) {
                throw ({
                    message: 'You must provide slack userid',
                    code: 500,
                });
            }

            const score = await givenBurritosToday(user);

            const data = {
                error: false,
                code: 200,
                message: 'ok',
                data: score,
            };

            return response(data, res);
        } catch (err) {
            log.warn(err);
            return response({
                error: true,
                code: err.code || 500,
                message: err.message,
                data: null,
            }, res, err.code || 500);
        }
    },
});


Route.add({
    method: 'GET',
    path: `${apiPath}scoreboard/{listType}/{scoreTypeInput}/{time}`,
    handler: async (request: any, res: any) => {
        try {
            const {listType, scoreTypeInput, time} = request.params;

            const scoreType = scoreTypeInput || 'inc';
            const timeType = time || 'thismonth';
            console.log(timeType);

            if (!ALLOWED_LISTTYPES.includes(listType)) {
                throw ({
                    message: 'Allowed listType is to or from',
                    code: 400,
                });
            }

            if (!ALLOWED_SCORETYPES.includes(scoreType)) {
                throw ({
                    message: 'Allowed scoreType is inc or dec',
                    code: 400,
                });
            }

            if (!ALLOWED_TIMES.includes(timeType)) {
                throw ({
                    message: 'Allowed times is thismonth or pastmonth or every',
                    code: 400,
                });
            }

            const score = await getScoreBoard(listType, scoreType, timeType);

            const data = {
                error: false,
                code: 200,
                message: 'ok',
                data: score,
            };

            return response(data, res);
        } catch (err) {
            log.warn(err);
            return response({
                error: true,
                code: err.code || 500,
                message: err.message,
                data: null,
            }, res, err.code || 500);
        }
    },
});

/**
 * Add route for userScore
 */
Route.add({
    method: 'GET',
    path: `${apiPath}userscore/{user}/{listType}/{scoreType}/{time}`,
    handler: async (request: any, res: any) => {
        try {
            const {user: userId, listType, scoreType, time} = request.params;
            const timesType = time || 'thismonth';

            if (!userId) {
                throw ({
                    message: 'You must provide slack userid',
                    code: 500,
                });
            }

            if (!ALLOWED_LISTTYPES.includes(listType)) {
                throw ({
                    message: 'Allowed listType is to or from',
                    code: 400,
                });
            }

            if (!ALLOWED_SCORETYPES.includes(scoreType)) {
                throw ({
                    message: 'Allowed scoreType is inc or dec',
                    code: 400,
                });
            }

            const {...result} = await getUserScore(userId, listType, scoreType, timesType);

            const data = {
                error: false,
                code: 200,
                message: 'ok',
                data: {
                    ...result,
                },
            };
            return response(data, res);
        } catch (err) {
            log.warn(err);
            return response({
                error: true,
                code: err.code || 500,
                message: err.message,
                data: null,
            }, res, err.code || 500);
        }
    },
});


/**
 * Add route for userstats
 */
Route.add({
    method: 'GET',
    path: `${apiPath}userstats/{user}/{time}`,
    handler: async (request: any, res: any) => {
        try {
            const {user: userId, time} = request.params;

            console.log(`time=${time}`);
            const timesType = time || 'thismonth';

            if (!userId) {
                throw ({
                    message: 'You must provide slack userid',
                    code: 500,
                });
            }

            const {...result} = await getUserStats(userId, timesType);

            const data = {
                error: false,
                code: 200,
                message: 'ok',
                data: {
                    ...result,
                },
            };
            return response(data, res);
        } catch (err) {
            log.warn(err);
            return response({
                error: true,
                code: err.code || 500,
                message: err.message,
                data: null,
            }, res, err.code || 500);
        }
    },
});

Route.add({
    method: 'POST',
    path: `${apiPath}/histogram`,
    handler: async (request: any, res: any) => {
        try {
            /* Should be able to take folling params
             * userID | null
             * startDate | null
             * endDate | null
             * type ( given / gived ) | return both ?
             *
             */
            const data = {
                error: false,
                code: 200,
                message: null,
                data: null,
            };
            return response(data, res);
        } catch (err) {
            log.warn(err);
            return response({
                error: true,
                code: err.code || 500,
                message: err.message,
                data: null,
            }, res, err.code || 500);
        }
    },
});

Route.add({
    method: 'GET',
    path: `${apiPath}/statistic.csv`,
    handler: async (req: any, res: any) => {
        const { date } = req.params;
        log.info(`date: ${date}`);
        const result = 'Year,Make,Model\n' +
            '1997,Ford,E350\n' +
            '2000,Mercury,Cougar';
        return csvResponse(result, res);
    }
})

export default (req: any, res: any) => {
    const method: string = req.method.toLowerCase();
    const path: string = req.url;
    const {route, request, error} = Route.check({method, path, req});
    if (error) return response({error: true}, res, 500);
    return route.handler(request, res);
};
