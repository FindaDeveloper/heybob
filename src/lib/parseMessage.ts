const usernameRegex: RegExp = /(<@[A-Z0-9]{2,}>)/g;

/**
 * @param { string } text from slack message
 * @returns array<string>, only unique values
 */
function parseUsernames(text: string): string[] {
    // Regex to get all users from message
    const usersRaw = text.match(new RegExp(usernameRegex));
    if (!usersRaw) return [];
    // replace unwanted chars
    const users = usersRaw.map((x) => x.replace('<@', '').replace('>', ''));
    // Remove duplicated values
    const unique: string[] = users.filter((v, i, a) => a.indexOf(v) === i);
    return unique.length ? unique : [];
}

/**
 * @param { Obejct } msg slackmessage
 * @param { array<object> } emojis emojis that we want to use. Comes from env
 * @return { object } { giver: string, updates:array<object> }
 *  - giver: sent from , ex => giver: USER1
 *  - updates: array<object> containing, username, and type. ex:
 *  - [ { username: 'USER2', type: 'inc' },
 *    { username: 'USER2', type: 'dec' } ] }
 */
function parseMessage(msg, emojis) {
    // Array containg data of whom to give / remove points from
    const updates = [];

    // Array with "allowed" emojis mentioned in slackmessage
    const emojiHits = [];

    // Get usernames from slack message
    const users: string[] = parseUsernames(msg.text);
    if (!users.length) return false;

    // Match and push allowed emojis to emojiHits
    emojis.map((x: any) => {
        const hitsRaw = msg.text.match(new RegExp(x.emoji, 'g'));
        if (hitsRaw) hitsRaw.forEach((e: any) => emojiHits.push(e));
        return undefined;
    });

    // Rebuild emoji object with emojiHits
    const hits = emojiHits.map((x: any) => (
        {
            emoji: x,
            type: emojis.filter((t: any) => t.emoji === x)[0].type,
        }
    ));

    if (hits.length === 0) return false;

    users.forEach((u) => updates.push({ username: u, type: 'inc' }));

    return {
        updates,
        giver: msg.user,
        emoji: hits[0].emoji
    };
}

export { parseMessage, parseUsernames };
