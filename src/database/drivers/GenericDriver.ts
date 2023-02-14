import Store from './Store';
import Driver from './Driver';
import Score from '../../types/Score.interface';
import { time } from '../../lib/utils';

function id() {
    // Cred => https://gist.github.com/gordonbrander/2230317
    const str: string = Math.random().toString(36).substr(2, 9);
    return `_${str}`;
}

interface Find {
    _id: string;
    to: string;
    from: string;
    value: number;
    given_at: Date;

    emoji: string | undefined;
}

interface Sum {
    _id?: string; // Username
    score?: number;
}

class GenericDriver extends Store implements Driver {
    constructor(public driver: string) {
        super(driver);
    }

    async give(to: string, from: string, emoji: string, date: any): Promise<any> {
        const score: Score = {
            _id: id(),
            to,
            from,
            value: 1,
            given_at: date,
            emoji
        };
        await this.storeData(score);
        return Promise.resolve(true);
    }

    async takeAway(to: string, from: string, date: any): Promise<any> {
        const score: Score = {
            _id: id(),
            to,
            from,
            value: -1,
            given_at: date,
            emoji: ''
        };
        await this.storeData(score);
        return Promise.resolve(true);
    }

    async getScore(user: string, listType: string, timesType: string, num = false): Promise<number | Find[]> {
        console.log(`timesType: ${timesType}`);
        this.syncData();
        const data: any = await this.getData();
        const filteredData = data.filter((item: any) => {
            if (item[listType] === user) {
                if (timesType == 'thismonth') {
                    if (item.given_at.getMonth() == new Date().getMonth()) {
                        return item;
                    }
                } else if (timesType == 'pastmonth') {
                    let pastMonth = new Date().getMonth();
                    if (pastMonth == 0) {
                        pastMonth = 12;
                    }

                    if (item.given_at.getMonth() == (pastMonth - 1)) {
                        return item;
                    }
                }else {
                    return item;
                }
            }
            return undefined;
        }).map(y => y);
        if (num) {
            const score: number = filteredData.reduce((a: number, item: any) => a + item.value, 0);
            return Promise.resolve(score);
        }
        return Promise.resolve(filteredData);
    }

    async findFromToday(user: string, listType: string): Promise<Find[]> {
        this.syncData();
        const data: any = await this.getData();
        const filteredData = data.filter((item) => {
            if (item[listType] === user
                && item.given_at.getTime() < time().end.getTime()
                && item.given_at.getTime() > time().start.getTime()) {
                return item;
            }
            return undefined;
        }).filter((y) => y);
        return filteredData;
    }

    async findFromThisMonth(user: string, listType: string): Promise<Find[]> {
        this.syncData();
        const data: any = await this.getData();
        const filteredData = data.filter((item) => {
            if (item[listType] === user && item.given_at.getMonth() == (new Date()).getMonth()) {
                return item;
            }
            return undefined;
        }).filter((y) => y);
        return filteredData;
    }

    async getScoreBoard({ user, listType, timesType }): Promise<Sum[]> {
        this.syncData();
        const data: any = await this.getData();
        const timeType = timesType || 'thismonth';

        let listTypeSwitch: string;
        if (user) {
            listTypeSwitch = (listType === 'from') ? 'to' : 'from';
        } else {
            listTypeSwitch = listType;
        }
        const selected = data.filter((item: any) => {
            if (timeType == 'thismonth') {
                if (item.given_at.getMonth() == new Date().getMonth()) {
                    if (user) {
                        if (item[listTypeSwitch] === user) {
                            return item;
                        }
                    } else {
                        return item
                    }
                }
            } else if (timeType == 'pastmonth') {
                var pastMonth = new Date().getMonth();
                if (pastMonth == 0) {
                    pastMonth = 12;
                }

                if (item.given_at.getMonth() == (pastMonth - 1)) {
                    if (user) {
                        if (item[listTypeSwitch] === user) {
                            return item;
                        }
                    } else {
                        return item
                    }
                }
            } else {
                if (user) {
                    if (item[listTypeSwitch] === user) {
                        return item;
                    }
                } else {
                    return item
                }
            }
            return undefined;
        }).filter((y: any) => y);
        return selected;
    }
}

export default GenericDriver;
