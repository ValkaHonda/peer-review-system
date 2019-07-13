import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkItem } from "../entities/work-item.entity";
import { Repository } from "typeorm";
import { User } from "../entities/user.entity";
import { CreateWorkItemDTO } from "./models/create-work-item.dto";
import { AddReviwerDTO } from "./models/add-reviewer.dto";
import { ReviewerStatus } from "../entities/reviewer-status.entity";
import { Review } from "../entities/review.entity";
import { ShowWorkItemDTO } from "./models/show-work-item.dto";
import { ShowReviewerDTO } from "./models/show-reviewer.dto";
import { ShowAssigneeDTO } from "./models/show-assignee.dto";
import { WorkItemStatus } from "../entities/work-item-status.entity";
import { AddTagDTO } from "./models/add-tag.dto";
import { Tag } from "../entities/tag.entity";
import { ShowTagDTO } from "./models/show-tag.dto";
import { Team } from "../entities/team.entity";
import { ShowTeamDTO } from "src/team/models/show-team.dto";

@Injectable()
export class WorkItemService {
  constructor(
    @InjectRepository(WorkItem)
    private readonly workItemRepository: Repository<WorkItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ReviewerStatus)
    private readonly reviewerStatusRepository: Repository<ReviewerStatus>,
    @InjectRepository(WorkItemStatus)
    private readonly workItemStatusRepository: Repository<WorkItemStatus>,
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    @InjectRepository(Tag)
    private readonly tagsRepository: Repository<Tag>,
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
    
  ) {}
  async createWorkItem(loggedUser: User, createWorkItemDTO: CreateWorkItemDTO)
    : Promise<ShowWorkItemDTO>{
    const reviewerDTOs: AddReviwerDTO[] = createWorkItemDTO.reviewers;
    const reviewerEntities: User[] = await this.getReviewerEntities(reviewerDTOs);
    const newWorkItem: WorkItem = new WorkItem();
    newWorkItem.assignee = loggedUser;
    newWorkItem.title = createWorkItemDTO.title;
    newWorkItem.description = createWorkItemDTO.description;

    const workItemReviewEntities: Review[] = await this.createReviews(reviewerEntities);

    newWorkItem.reviews = workItemReviewEntities;
    const pendingWorkItemStatus: WorkItemStatus = await this.workItemStatusRepository
      .findOne({
        where: {
          status: 'pending',
        }
      });
    newWorkItem.workItemStatus = pendingWorkItemStatus;
    const tags = await this.findTagsByNames(createWorkItemDTO.tags);
    newWorkItem.tags = Promise.resolve(tags);
    const team: Team = await this.teamsRepository
      .findOne({
        where: {
          teamName: createWorkItemDTO.team,
        }
      });
    newWorkItem.team = team;
    const createdWorkItem: WorkItem = await this.workItemRepository.save(newWorkItem);
    
    return this.convertToShowWorkItemDTO(createdWorkItem);
  }

  async getWorkItemsByUserId(userId: string): Promise<ShowWorkItemDTO[]> {
    const foundUser: User = await this.userRepository
      .findOne({
        where: {
          id: userId,
        }
      });
    const workItems: WorkItem[] = await this.workItemRepository.find({
      where: {
        assignee: foundUser,
      }
    }
    );
    return this.convertToShowWorkItemDTOs(workItems);
  }
  async findWorkItemsByTeam(teamId: string): Promise<ShowWorkItemDTO[]>{
    const team: Team = await this.teamsRepository
      .findOne({
        where: {
          id: teamId,
        }
      })
    console.log('The team **************->',team);
    if(!team){
      return undefined;
    }
    // const teamWorkItems: WorkItem[] = [];
    const teamWorkItems: Set<WorkItem> = new Set<WorkItem>();
    const users: User[] = team.users;
    const createWorkItems: WorkItem[] = []; // we need a method
    console.log('Users if a team /////////////////->',users);

    const createdWorkItems: WorkItem[] = await this.getWorkItemsCreatedByUsers(users);
    console.log('createdWorkItems->@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@',createdWorkItems);
    
    const workItemsForReviewConnectedToTeam: WorkItem[] = await this.getWokrItemReviewByUsers(users);
    console.log('workItems that are being under review -> !!!!!!!!!!!!!!!!!!!!!!!!!!!',workItemsForReviewConnectedToTeam);
    
    for (const workItem of createWorkItems) {
      teamWorkItems.add(workItem);
    }
    for (const workItem of workItemsForReviewConnectedToTeam) {
      teamWorkItems.add(workItem);
    }

    console.log('work items for the result ->(((((((((((((((((((((((',teamWorkItems);
    
    return this.convertToShowWorkItemDTOs([...teamWorkItems]);
  }

  private async getWokrItemReviewByUsers(users: User[]): Promise<WorkItem[]>{
    const workItems: WorkItem[] = [];
    for (const user of users) {
      const usersWorkItemsHeIsReviewing: WorkItem[] = await this.getWorkItemsByUserHisReviewing(user);
      workItems.push(...usersWorkItemsHeIsReviewing);
    }
    return workItems;
  }

  private async getWorkItemsByUserHisReviewing(user: User): Promise<WorkItem[]> {
    const workItems: WorkItem[] = [];
    const reviews: Review[] = await this.reviewsRepository
      .find({
        where: {
          user: user,
        }
      });
    for (const review of reviews) {
      const workItem: WorkItem = await review.workItem;
      console.log('single workItem of a reviewer----- -----    ------->',review);
      console.log('his workistem tha he is being reviewing (assignee TESTING-> ~~~~~~~~~~~~~~~~~~~~~~',workItem.assignee);
      
      workItems.push(workItem);
    }
    return workItems;
  }
  private async getWorkItemsCreatedByUsers(users: User[]): Promise<WorkItem[]> {
    const workItems: WorkItem[] = [];
    for (const user of users) {
      const currentUserWorkItems: WorkItem[] = await this.workItemRepository
        .find({
          where: {
            assignee: user,
          }
        });
      console.log('Work items for user%%%%%%%%%%%%%%%%%%%%:',user);
      console.log('His workItems: #########################',currentUserWorkItems);
     
      workItems.push(...currentUserWorkItems);
      
    }
    return workItems;
  }
  private async convertToShowWorkItemDTOs(workItems: WorkItem[]): Promise<ShowWorkItemDTO[]> {
    return Promise.all(workItems.map(async (entity: WorkItem) => this.convertToShowWorkItemDTO(entity)));
}
  private async createReviews(reviewers: User[]) :Promise<Review[]>{
    let reviews: Review[] = [];
    const pendingReviewerStatus = await this.reviewerStatusRepository
      .findOne({
        where: {
          status: 'pending'
        }
      });

    // reviewers.foreach will not work, because we have a async call to a repository!
    for (const currentReviwer of reviewers) {
      const newReview: Review = new Review();
      newReview.user = currentReviwer;
      newReview.reviewerStatus = pendingReviewerStatus;
      
      const saveRev = await this.reviewsRepository.save(newReview);
      
      reviews = [...reviews, saveRev];
    }
    
    return reviews;
  }

  private async findTagsByNames(tagNames: AddTagDTO[]): Promise<Tag[]>{
    let tags: Tag[] = [];
    for (const currentTagDTO of tagNames) {
      const tagName = currentTagDTO.name;
      const currentTagEntity = await this.tagsRepository
        .findOne({
          where: {
            name: tagName,
          }
        });
      tags = [...tags,currentTagEntity];
    }
    return tags;
  }
  private getReviewerEntities(reviewerDTOs: AddReviwerDTO[]) :Promise<User[]>{
    if(!reviewerDTOs){
      return Promise.resolve([]);
    }
    const reviewerEntities: User[] = [];
    reviewerDTOs.forEach(async (currentReviewerDTO: AddReviwerDTO)=>{
      const foundReviewerEntity = await this.userRepository.findOne({
        where: {
          username: currentReviewerDTO.username,
          isDeleted: false,
        },
      });
      reviewerEntities.push(foundReviewerEntity);
    });
    return Promise.resolve(reviewerEntities);
  }
  private async convertToShowReviewerDTO(reviewer: Review): Promise<ShowReviewerDTO> {
    const userEntity: User = await reviewer.user;

    const convertedReviewer: ShowReviewerDTO = {
      id: userEntity.id,
      email: userEntity.email,
      status: reviewer.reviewerStatus.status,
      username: userEntity.username,
    };
    return Promise.resolve(convertedReviewer);
  }
  private async convertToShowReviewerDTOArray(reviewers: Review[]): Promise<ShowReviewerDTO[]> {
    if(!reviewers){
      return [];
    }
    return Promise.all(reviewers.map(async (entity: Review) => this.convertToShowReviewerDTO(entity)));
}

  private async convertToShowWorkItemDTO(workItem: WorkItem): Promise<ShowWorkItemDTO> {
    if(!workItem){
      return new ShowWorkItemDTO();
    }
    const showReviewersDTO: ShowReviewerDTO[] = await this.convertToShowReviewerDTOArray(await workItem.reviews);
    if(!showReviewersDTO){
      return new ShowWorkItemDTO();
    }
    console.log('workitem assignee ->}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}',workItem.assignee);
    if(!workItem.assignee) {
      return new ShowWorkItemDTO();
    }
    
    const assigneeDTO: ShowAssigneeDTO = {
      id: workItem.assignee.id,
      email: workItem.assignee.email,
      username: workItem.assignee.username,
    };
    const tagDTOs: ShowTagDTO[] = this.convertTagstoDTOs(await workItem.tags);
    const convertedWorkItem: ShowWorkItemDTO = {
      id: workItem.id,
      isReady: workItem.isReady,
      title: workItem.title,
      description: workItem.description,
      assignee: assigneeDTO,
      reviews: showReviewersDTO,
      workItemStatus: workItem.workItemStatus.status,
      tags: tagDTOs,
      team: workItem.team.teamName,
    };
    return convertedWorkItem;
  }
  private convertTagstoDTOs(tags: Tag[]): ShowTagDTO[]{
    return tags.map((tagEntity :Tag) :ShowTagDTO => ({
      id: tagEntity.id,
      name: tagEntity.name,
    }));
  }
}