import { Tag } from './tag';
import { Reviewer } from './reviewer';
import { Assignee } from './assinee';

export class WorkItem {
    id: string;

    isReady: boolean;
    
    title: string;
  
    description: string;
  
    assignee: Assignee;
  
    workItemStatus: string;
  
    reviews: Reviewer[];

    tags: Tag[];

    team: string;
}