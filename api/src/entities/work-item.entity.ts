import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
} from "typeorm";
import { WorkItemStatus } from "./work-item-status.entity";
import { Tag } from "./tag.entity";
import { Review } from "./review.entity";
import { Picture } from "./picture.entity";
import { FileEntity } from "./file.entity";
import { User } from "./user.entity";
import { Team } from "./team.entity";
import { CommentEntity } from "./comment.entity";

@Entity("work_items")
export class WorkItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ default: false })
  isReady: boolean;

  @Column("nvarchar")
  title: string;

  @Column({ type: "text" }) // It could be not Enough!
  description: string;

  @ManyToOne(type => User, user => user.workItems, {
    eager: true,
  })
  author: User;

  @ManyToOne(type => WorkItemStatus, status => status.workItems, {
    eager: true,
  })
  workItemStatus: WorkItemStatus;

  @ManyToMany(type => Tag, tag => tag.workItems)
  @JoinTable()
  tags: Promise<Tag[]>;

  @OneToMany(type => Review, review => review.workItem)
  reviews: Promise<Review[]>;

  @OneToMany(type => CommentEntity, comments => comments.workItem, {
    eager: true,
  })
  comments: CommentEntity[];

  @OneToMany(type => Picture, picture => picture.workItem)
  pictures: Promise<Picture>;

  @OneToMany(type => FileEntity, file => file.workItem)
  files: Promise<FileEntity[]>;

  @ManyToOne(type => Team, team => team.workItems, {
    eager: true,
  })
  team: Team;
}
