import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { UserDetails } from "src/app/models/user-details";
import { WorkItem } from "src/app/models/work-item";
import { Router, ActivatedRoute } from "@angular/router";
import { AuthenticationService } from "src/app/core/services/authentication.service";
import { Review } from "src/app/models/review";
import { SubmitComment } from "src/app/models/submit-comment";
import { CommentsDataService } from "src/app/core/services/comments-data.service";
import { Comment } from "src/app/models/comment";
import { NotificatorConfigService } from "src/app/core/services/notificator-config.service";

@Component({
  selector: "item-details",
  templateUrl: "./item-details.component.html",
  styleUrls: ["./item-details.component.css"]
})
export class ItemDetails implements OnInit {
  public workItem: any;
  public loggedUser: UserDetails;
  public isReviewer: boolean = false;
  public isAssignee: boolean = false;
  public reviewId: string;
  public comments: Comment[] = [];
  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly authenticationService: AuthenticationService,
    private readonly commentDataService: CommentsDataService,
    private readonly notificatorConfigService: NotificatorConfigService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(data => {
      console.log(data);

      this.workItem = data.workItem;
      this.comments = this.workItem.comments;
    });
    console.log(this.workItem);

    this.loggedUser = this.authenticationService.currentUserValue.user;
    this.updateReviewerAuthority();
    this.updateAssigneeAuthority();
    console.log("isreavewer", this.isReviewer);
    this.getCurrentReview();
    this.notificatorConfigService.configEngagespotNotificator();
  }

  updateReviewerAuthority() {
    const reviews: Review[] = this.workItem.reviews;
    const isUserAReviewer = reviews.some(
      review => review.username === this.loggedUser.username
    );
    this.isReviewer = isUserAReviewer;
  }

  updateAssigneeAuthority() {
    if (this.workItem.author.id === this.loggedUser.id) {
      this.isAssignee = true;
    } else {
      this.isAssignee = false;
    }
  }

  getCurrentReview() {
    const reviews: Review[] = this.workItem.reviews;
    let review: Review = reviews.find(
      review => review.username === this.loggedUser.username
    );
    if (review) {
      this.reviewId = review.reviewId;
    }
  }

  onCommentSubmition(event: SubmitComment) {
    if (event.status === "comment") {
      this.commentDataService
        .addComment(this.workItem.id, event.content)
        .subscribe((createdComment: Comment) =>
          this.comments.push(createdComment)
        );
    } else {
      const reviewId = this.reviewId;
      this.commentDataService
        .changeReviewStatus(reviewId, this.workItem.id, event)
        .subscribe(data => this.comments.push(data.comment));
    }
  }

  checkEditingRights() {
    if (this.workItem.workItemStatus.status === "rejected") {
      return false;
    }
    if (
      this.loggedUser.username === this.workItem.author.username ||
      this.loggedUser.role === "admin"
    ) {
      return true;
    }
  }
  filesToShow(): boolean {
    if (!this.workItem.files) {
      return false;
    }
    return this.workItem.files.length > 0;
  }
}
