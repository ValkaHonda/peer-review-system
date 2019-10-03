import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  OneToMany,
  JoinTable,
  ManyToOne,
} from 'typeorm';
import { Role } from './role.entity';
import { Team } from './team.entity';
import { TeamInvitation } from './team-invitation.entity';
import { Activity } from './activity.entity';
import { WorkItem } from './work-item.entity';
import { Review } from './review.entity';
import { CommentEntity } from './comment.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('nvarchar', { unique: true })
  username: string;

  @Column('nvarchar', { unique: true })
  email: string;

  @Column('nvarchar')
  avatarURL: string;

  @Column('nvarchar')
  password: string;

  @Column('nvarchar')
  firstName: string;

  @Column('nvarchar')
  lastName: string;

  @Column({ default: false })
  isDeleted: boolean;

  @ManyToOne(type => Role, role => role.name)
  role: Promise<Role>;

  @ManyToMany(type => Team, team => team.users)
  teams: Promise<Team[]>;

  @OneToMany(type => TeamInvitation, teamInvitation => teamInvitation.host)
  host: Promise<TeamInvitation>;

  @OneToMany(type => TeamInvitation, teamInvitation => teamInvitation.invitee)
  invitee: Promise<TeamInvitation>;

  @OneToMany(type => Activity, activity => activity.user)
  activity: Promise<Activity[]>;

  @OneToMany(type => WorkItem, workItem => workItem.author)
  workItems: Promise<WorkItem>;

  @OneToMany(type => Review, review => review.user)
  reviews: Promise<Review[]>;

  @OneToMany(type => CommentEntity, comment => comment.author)
  comments: Promise<CommentEntity[]>;
}
