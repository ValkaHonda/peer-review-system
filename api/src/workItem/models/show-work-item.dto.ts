import { ShowAssigneeDTO } from "./show-assignee.dto";
import { ShowReviewValDTO } from "./show-reviewer.dto";
import { ShowTagDTO } from "./show-tag.dto";
import { ShowCommentDTO } from "src/review-requests/models/show-comment.dto";

export class ShowWorkItemDTO {
  id: string;

  isReady: boolean;

  title: string;

  description: string;

  assignee: ShowAssigneeDTO;

  workItemStatus: string;

  reviews: ShowReviewValDTO[];

  tags: ShowTagDTO[];

  team: string;

  comments: ShowCommentDTO[];
}
