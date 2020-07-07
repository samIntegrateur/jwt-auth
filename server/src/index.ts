import "reflect-metadata";
import "dotenv/config";
import express from 'express';
import {ApolloServer} from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { UserResolver } from './UserResolver';
import { createConnection } from 'typeorm';
import cookieParser from 'cookie-parser';
import { verify } from 'jsonwebtoken';
import cors from 'cors';
import { User } from './entity/User';
import { createAccessToken, createRefreshToken } from './auth';
import { sendRefreshToken } from './sendRefreshToken';

(async () => {
    const app = express();

    app.use(cors({
        origin: 'http://localhost:3000',
        credentials: true,
    }));

    app.use(cookieParser());

    app.get('/', (_req, res) => res.send('Hello'));

    // use the refresh token cookie to get new access token and refresh token
    app.post('/refresh-token', async (req, res) => {
        const token = req.cookies.jid;
        if (!token ) {
            console.log('no jid cookie');
            return res.send({ ok: false, accessToken: '' });
        }
        console.log('req.cookies', req.cookies);

        let payload: any = null;

        try {
            payload = verify(token, process.env.REFRESH_TOKEN_SECRET!);
        } catch (e) {
            console.log('e', e);
            return res.send({ ok: false, accessToken: '' });
        }

        // token valid, we can send back an access token
        const user = await User.findOne({id: payload.userId});

        if (!user ) {
            console.log('user not found');
            return res.send({ ok: false, accessToken: '' });
        }

        // Security : add a "versioning"
        if (user.tokenVersion !== payload.tokenVersion) {
            console.log('bad token version');
            return res.send({ ok: false, accessToken: '' });
        }

        sendRefreshToken(res, createRefreshToken(user));

        return res.send({ ok: true, accessToken: createAccessToken(user) });

    });

    await createConnection();

    const apolloServer = new ApolloServer({
      schema: await buildSchema({
          resolvers: [UserResolver],
      }),
        context: ({req, res}) => ({ req, res })
    });

    apolloServer.applyMiddleware({ app, cors: false, });

    app.listen(4001, () => {
        console.log('express server started');
    });
})();

// createConnection().then(async connection => {
//
//     console.log("Inserting a new user into the database...");
//     const user = new User();
//     user.firstName = "Timber";
//     user.lastName = "Saw";
//     user.age = 25;
//     await connection.manager.save(user);
//     console.log("Saved a new user with id: " + user.id);
//
//     console.log("Loading users from the database...");
//     const users = await connection.manager.find(User);
//     console.log("Loaded users: ", users);
//
//     console.log("Here you can setup and run express/koa/any other framework.");
//
// }).catch(error => console.log(error));
