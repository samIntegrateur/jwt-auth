import { Arg, Ctx, Field, Int, Mutation, ObjectType, Query, Resolver, UseMiddleware } from 'type-graphql';
import { compare, hash } from 'bcryptjs';
import { User } from './entity/User';
import { MyContext } from './MyContext';
import { createAccessToken, createRefreshToken } from './auth';
import { isAuth } from './isAuth';
import { sendRefreshToken } from './sendRefreshToken';
import { getConnection } from 'typeorm';
import { verify } from 'jsonwebtoken';

@ObjectType()
class LoginResponse {

    @Field()
    accessToken: string;

    @Field(() => User)
    user: User;
}

@Resolver()
export class UserResolver {
    @Query(() => String)
    hello() {
        return 'hi!'
    }

    @Query(() => String)
    @UseMiddleware(isAuth)
    bye(
        @Ctx() {payload}: MyContext,
    ) {
        console.log('payload', payload);
        return `userId ${payload!.userId}`
    }

    @Query(() => [User])
    users() {
        return User.find();
    }

    @Query(() => User, {nullable: true})
    me(
        @Ctx() context: MyContext,
    ) {
        const authorization = context.req.headers['authorization'];

        if (!authorization) {
            console.log('Not authenticated');
            return null;
        }

        try {
            const token = authorization.split(' ')[1];
            const payload: any = verify(token, process.env.ACCESS_TOKEN_SECRET!);
            return User.findOne(payload.userId);
        } catch (e) {
            console.log('er', e);
            return null;
        }
    }


    @Mutation(() => Boolean)
    async logout( @Ctx() {res}: MyContext) {
        sendRefreshToken(res, '');
        return true;
    }

    // Increment token version, tokens with older version will be invalid
    @Mutation(() => Boolean)
    async revokeRefreshTokensForUser(
        @Arg('userId', () => Int) userId: number,
    ) {
        await getConnection().getRepository(User).increment(
            {id: userId},
            'tokenVersion',
            1
        );
        return true;
    }

    @Mutation(() => Boolean)
    async register(
        @Arg('email') email: string,
        @Arg('password') password: string,
    ) {

        try {
            const hashedPassword = await hash(password, 12);

            await User.insert({
                email,
                password: hashedPassword,
            });
        } catch (e) {
            console.log('err', e);
            return false;
        }

        return true;
    }

    @Mutation(() => LoginResponse)
    async login(
        @Arg('email') email: string,
        @Arg('password') password: string,
        @Ctx() {res}: MyContext,
    ): Promise<LoginResponse> {

        const user = await User.findOne({ where: { email }});

        if (!user) {
            throw new Error('invalid login');
        }

        const valid = await compare(password, user.password);

        if (!valid) {
            throw new Error('bad password');
        }

        // this cookie can be sent with a post to "refresh-token" (see index) to get a new accessToken
        sendRefreshToken(res, createRefreshToken(user));

        // this one will be sent in headers for authent only queries (see isAuth)
        return {
            accessToken: createAccessToken(user),
            user,
        }

    }
}
