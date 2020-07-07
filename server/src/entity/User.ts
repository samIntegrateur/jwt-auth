import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
import { Field, Int, ObjectType } from 'type-graphql';

@ObjectType()
@Entity('users')
export class User extends BaseEntity {

    @Field(() => Int)
    @PrimaryGeneratedColumn()
    id: number;

    @Field()
    @Column('text')
    email: string;

    @Column('text')
    password: string;

    // Add version for forget password or account hacked
    // https://www.youtube.com/watch?v=25GS0MLT8JU around 1:18
    @Column('int', { default: 0 })
    tokenVersion: number;
}
