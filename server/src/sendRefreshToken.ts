import { Response } from 'express';

export const sendRefreshToken = (res: Response, token: string) => {
    res.cookie('jid',
        token,
        {
            httpOnly: true,
            // see https://www.youtube.com/watch?v=ZAsZ2hhdj-s 4:00
            // path: '/refresh-token'
        }
    );
};
