import * as log from 'bog';
import { EventEmitter } from 'events';

interface Find {
    _id: string;
    to: string;
    from: string;
    value: number;
    given_at: Date;
}

interface Sum {
    _id?: string; // Username
    score?: number;
}

interface GetUserStats {
    _id: string;
    received: number;
    given: number;
    receivedToday: number;
    receivedFindToday: Find[],
    givenToday: number;
}

interface DatabasePost {
    _id: string,
    to: string,
    from: string,
    value: number,
    given_at: Date
}

class BurritoStore extends EventEmitter {
    database: any = null;

    // Set and Store database object
    setDatabase(database: any) {
        this.database = database;
    }

    async giveBurrito(to: string, from: string, emoji: string, date = new Date()): Promise<string> {
        log.info(`Burrito given to ${to} from ${from}`);
        await this.database.give(to, from, date, emoji);
        this.emit('GIVE', to, from);
        return to;
    }

    async takeAwayBurrito(to: string, from: string, date = new Date()): Promise<string | []> {
        log.info(`Burrito taken away from ${to} by ${from}`);
        const score: number = await this.database.getScore(to, 'to', true);
        if (!score) return [];
        await this.database.takeAway(to, from, date);
        this.emit('TAKE_AWAY', to, from);
        return to;
    }

    async getUserStats(user: string, timesType: string): Promise<GetUserStats> {
        console.log(`store timesType: ${timesType}`);
        const [
            received,
            given,
            receivedToday,
            receivedFindToday,
            givenToday,
        ]: [Sum[], Sum[], number, Find[], number] = await Promise.all([
            this.database.getScore(user, 'to', timesType),
            this.database.getScore(user, 'from', timesType),
            this.givenBurritosToday(user, 'to'),
            this.givenRiceFindToday(user, 'to'),
            this.givenBurritosToday(user, 'from'),
        ]);
        return {
            receivedToday,
            givenToday,
            receivedFindToday,
            _id: user,
            received: received.length,
            given: given.length,
        };
    }

    async getScoreBoard({ ...args }): Promise<DatabasePost[]> {
        console.log(args);
        return this.database.getScoreBoard({ ...args });
    }

    /**
     * @param {string} user - userId
     * @param {string} listType - to / from defaults from
     */
    async givenBurritosToday(user: string, listType: string): Promise<number> {
        const givenToday: Find[] = await this.database.findFromToday(user, listType);
        return givenToday.length;
    }

    async givenRiceFindToday(user: string, listType: string): Promise<Find[]> {
        const givenToday: Find[] = await this.database.findFromToday(user, listType);
        return givenToday;
    }

    /**
     * @param {string} user - userId
     * @param {string} listType - to / from defaults from
     */
    async givenToday(user: string, listType: string, type: any = false): Promise<number> {
        const givenToday: Find[] = await this.database.findFromToday(user, listType);
        if (type) {
            if (['inc', 'dec'].includes(type)) {
                const valueFilter = (type === 'inc') ? 1 : -1;
                const givenFilter = givenToday.filter((x) => x.value === valueFilter);
                return givenFilter.length;
            }
        }
        return givenToday.length;
    }

    async givenThisMonth(user: string, listType: string): Promise<number> {
        const givenThisMonth: Find[] = await this.database.findFromThisMonth(user, listType);
        return givenThisMonth.length;
    }

    /**
     * @param {string} user - userId
     */
    async getUserScore(user: string, listType: string, num): Promise<number> {
        return this.database.getScore(user, listType, num);
    }
}

export default new BurritoStore();
