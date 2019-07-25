import { Component, OnInit } from "@angular/core";
import { WorkItemDataService } from "../core/services/work-item-data.service";
import { AuthenticationService } from "../core/services/authentication.service";
import { UserDetails } from "../models/user-details";
import { WorkItem } from "../models/work-item";

// pull-requests.component
@Component({
  selector: "pull-requests",
  templateUrl: "./pull-requests.component.html",
  styleUrls: ["./pull-requests.component.css"]
})
export class PullRequestsComponent {}
