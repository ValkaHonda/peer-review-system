import { UseGuards, Controller, Post, Body, ValidationPipe, Req, Get } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { WorkItemService } from "./work-item.service";
import { CreateWorkItemDTO } from "./models/create-work-item.dto";
import { ShowWorkItemDTO } from "./models/show-work-item.dto";
import { User } from "../entities/user.entity";
import { SessionUser } from "../decorators/session-user.decorator";

@UseGuards(AuthGuard())
@Controller('api/work-item')
export class WorkItemController {
  constructor(
    private readonly workItemService: WorkItemService,
  ) {}

  @Post()
  async create(
    @Body(new ValidationPipe({ whitelist: false, transform: true })) createWorkItemDTO: CreateWorkItemDTO,
    @SessionUser() user: User
    ): Promise<ShowWorkItemDTO> {
     return await this.workItemService.createWorkItem(user,createWorkItemDTO);
  }
  
  @Get()
    findAll(): string {
        return "findAll is not ready.";
    }


}