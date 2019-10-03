import { Injectable, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CommentEntity } from "src/entities/comment.entity";
import { AddCommentDTO } from "./models/add-comment.dto";
import { async } from "rxjs/internal/scheduler/async";
import { ShowCommentDTO } from "./models/show-comment.dto";
import { WorkItem } from "src/entities/work-item.entity";
import { plainToClass } from "class-transformer";
import { User } from "src/entities/user.entity";
import { ReviewerStatus } from "src/entities/reviewer-status.entity";
import { ChangeReviewStatusDTO } from "./models/change-review-status.dto";
import { Review } from "src/entities/review.entity";
import { ShowReviewDTO } from "./models/show-review.dto";
import { CombinedReviewDTO } from "./models/combined-review.dto";
import { EmailService } from "src/notifications/email.service";
import { PushNotificationService } from "src/notifications/push-notification.service";
import { ShowUserDTO } from "src/users/models/show-user.dto";
import { TeamRules } from "src/entities/team-rules.entity";
import { WorkItemStatus } from "src/entities/work-item-status.entity";
import { Team } from "src/entities/team.entity";

@Injectable()
export class ReviewRequestsService {
  public constructor(
    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>,
    @InjectRepository(WorkItem)
    private workItemRepository: Repository<WorkItem>,
    @InjectRepository(ReviewerStatus)
    private reviewStatusRepository: Repository<ReviewerStatus>,
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
    @InjectRepository(WorkItemStatus)
    private workItemStatusRepository: Repository<WorkItemStatus>,
    private readonly emailService: EmailService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  public async createReviewRequestComment(
    workItemId: string,
    commentContent: AddCommentDTO,
    user: User,
  ): Promise<ShowCommentDTO> {
    const commentEntity: CommentEntity = new CommentEntity();
    commentEntity.content = commentContent.content;
    commentEntity.author = user;
    const commentWorkItem = await this.workItemRepository.findOne({
      where: { id: workItemId },
    });
    commentEntity.workItem = Promise.resolve(commentWorkItem);
    const newComment: CommentEntity = await this.commentRepository.save(
      commentEntity,
    );
    const commentToShow = plainToClass(ShowCommentDTO, newComment, {
      excludeExtraneousValues: true,
    });
    await this.notifyForWorkItemComment(commentToShow, commentWorkItem);
    return await commentToShow;
  }

  public async changeReviewStatus(
    workItemId: string,
    reviewId: string,
    status: ChangeReviewStatusDTO,
    user: User,
  ): Promise<CombinedReviewDTO> {
    const newStatus: ReviewerStatus = await this.reviewStatusRepository.findOne(
      { where: { status: status.status } },
    );

    const review: Review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    const commentContent: AddCommentDTO = {
      content: status.content,
    };
    let commentDTO: ShowCommentDTO = null;

    if (newStatus.status !== "pending") {
      commentDTO = await this.createReviewRequestComment(
        workItemId,
        commentContent,
        user,
      );
    }

    review.reviewerStatus = newStatus;
    const newReview = await this.reviewRepository.save(review);

    const reviewToShow: ShowReviewDTO = {
      id: newReview.id,
      reviewStatus: newReview.reviewerStatus,
      user: await this.convertToShowUserDTO(newReview.user),
    };

    const combined: CombinedReviewDTO = {
      review: reviewToShow,
      comment: commentDTO,
    };
    const workItem: WorkItem = await this.workItemRepository.findOne({
      where: {
        id: workItemId,
      },
    });
    this.notifyForReviewStatusChange(workItem, combined);

    const isWorkItemStatusUpdated: boolean = await this.updateWorkItemStatus(
      workItem,
    );
    if (isWorkItemStatusUpdated) {
      const lockedWorkItem: WorkItem = await this.workItemRepository.findOne({
        where: {
          id: workItemId,
        },
      });
      this.notifyForWorkItemStatusChange(lockedWorkItem);
      // notify
    }

    return await combined;
  }

  private async notifyForWorkItemStatusChange(
    workItem: WorkItem,
  ): Promise<void> {
    const workItemStatus: WorkItemStatus = workItem.workItemStatus;
    const link: string = `http://localhost:4200/pullRequests/${workItem.id}`;
    const reviews: Review[] = await this.reviewRepository.find({
      where: {
        workItem: workItem,
      },
    });
    this.notifyUserForWorkItemStatusChange(
      workItem.author,
      workItem.title,
      workItemStatus.status,
      link,
    );
    reviews
      .map((review: Review) => review.user)
      .forEach(user =>
        this.notifyUserForWorkItemStatusChange(
          user,
          workItem.title,
          workItemStatus.status,
          link,
        ),
      );
  }
  private notifyUserForWorkItemStatusChange(
    user: User,
    workItemTitle: string,
    workItemStatus: string,
    workItemLink: string,
  ): void {
    this.emailService.sendEmail(
      user.email,
      "The peer review is complete.",
      `${workItemTitle} is ${workItemStatus}. Click here: ${workItemLink}`,
    );
    this.pushNotificationService.sendPushNotfication(
      "The peer review is complete.",
      `${workItemTitle} is ${workItemStatus}. Click here:`,
      user.username,
      workItemLink,
    );
  }
  private async updateWorkItemStatus(workItem: WorkItem): Promise<boolean> {
    const workItemTeam: Team = workItem.team;
    const teamRule: TeamRules = workItemTeam.rules;
    const reviews: Review[] = await workItem.reviews;
    let reviewStatuses: ReviewerStatus[] = [];
    for (const review of reviews) {
      const foundReview: Review = await this.reviewRepository.findOne({
        where: {
          id: review.id,
        },
      });
      const foundReviewStatus: ReviewerStatus = foundReview.reviewerStatus;
      reviewStatuses = [foundReviewStatus, ...reviewStatuses];
    }
    const isRejected: boolean = reviewStatuses.some(
      status => status.status === "rejected",
    );
    if (isRejected) {
      const workItemStatusRejected: WorkItemStatus = await this.workItemStatusRepository.findOne(
        {
          where: {
            status: "rejected",
          },
        },
      );
      workItem.workItemStatus = workItemStatusRejected;
      await this.workItemRepository.save(workItem);
      return true;
    }
    const acceptedCount: number = reviewStatuses.filter(
      status => status.status === "accepted",
    ).length;
    const acceptedPercentage: number = this.calculatePercentage(
      reviewStatuses.length,
      acceptedCount,
    );
    if (acceptedPercentage >= teamRule.minPercentApprovalOfItem) {
      // change te accepted
      const workItemStatusAccepted: WorkItemStatus = await this.workItemStatusRepository.findOne(
        {
          where: {
            status: "accepted",
          },
        },
      );
      workItem.workItemStatus = workItemStatusAccepted;
      await this.workItemRepository.save(workItem);
      return true;
    }

    return false;
  }
  private calculatePercentage(
    reviewsCount: number,
    acceptedCount: number,
  ): number {
    const percentage: number = (acceptedCount / reviewsCount) * 100;
    return percentage;
  }
  private async notifyForReviewStatusChange(
    workItem: WorkItem,
    combined: CombinedReviewDTO,
  ): Promise<void> {
    const reviews: Review[] = await workItem.reviews;

    let loadedReviews: Review[] = [];
    for (const currentReview of reviews) {
      const currentlyLoadedReview: Review = await this.reviewRepository.findOne(
        {
          where: {
            id: currentReview.id,
          },
        },
      );
      loadedReviews = [currentlyLoadedReview, ...loadedReviews];
    }
    this.notifyUserForReviewStatusChange(workItem.author, workItem, combined);

    loadedReviews
      .map((review: Review) => review.user)
      .filter((user: User) => user.id !== combined.review.user.id)
      .forEach((user: User) =>
        this.notifyUserForReviewStatusChange(user, workItem, combined),
      );
  }
  private notifyUserForReviewStatusChange(
    user: User,
    workItem: WorkItem,
    combined: CombinedReviewDTO,
  ): void {
    const link: string = `http://localhost:4200/pullRequests/${workItem.id}`;

    this.emailService.sendEmail(
      user.email,
      "Review status change",
      `${combined.comment.author.username} changed his review status to ${
        combined.review.reviewStatus.status
      } for Work Item ${workItem.title} because ${
        combined.comment.content
      }. Click here: ${link}`,
    );

    this.pushNotificationService.sendPushNotfication(
      "Review status change",
      `${combined.comment.author.username} changed his review status to ${
        combined.review.reviewStatus.status
      } for Work Item ${workItem.title}. Click here:`,
      user.username,
      link,
    );
  }

  private async notifyForWorkItemComment(
    comment: ShowCommentDTO,
    workItem: WorkItem,
  ): Promise<void> {
    const workItemAuthor: User = workItem.author;
    const reviews: Review[] = await workItem.reviews;
    let loadedReviews: Review[] = [];
    for (const currentReview of reviews) {
      const currentlyLoadedReview: Review = await this.reviewRepository.findOne(
        {
          where: {
            id: currentReview.id,
          },
        },
      );
      loadedReviews = [currentlyLoadedReview, ...loadedReviews];
    }

    const reviewersEntities: User[] = loadedReviews.map(
      (review: Review) => review.user,
    );
    if (comment.author.username !== workItemAuthor.username) {
      this.notifyUserForComment(workItem.author, workItem, comment);
    }

    reviewersEntities
      .filter((user: User) => user.id !== comment.author.id)
      .forEach((user: User) =>
        this.notifyUserForComment(user, workItem, comment),
      );
  }
  private notifyUserForComment(
    user: User,
    workItem: WorkItem,
    comment: ShowCommentDTO,
  ): void {
    const link: string = `http://localhost:4200/pullRequests/${workItem.id}`;

    this.emailService.sendEmail(
      user.email,
      "New comment",
      `${comment.author.username} commented on Work Item ${
        workItem.title
      }. Click here: ${link}`,
    );

    this.pushNotificationService.sendPushNotfication(
      "New comment",
      `${comment.author.username} commented on Work Item ${
        workItem.title
      }. Click here: ${link}`,
      user.username,
      link,
    );
  }
  private async convertToShowUserDTO(user: User): Promise<ShowUserDTO> {
    const convertedUser: ShowUserDTO = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: (await user.role).name,
      avatarURL: user.avatarURL,
    };
    return convertedUser;
  }
}
