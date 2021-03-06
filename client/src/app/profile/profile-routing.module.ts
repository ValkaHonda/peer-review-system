import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { ProfileComponent } from "./profile.component";
import { UsersResolverService } from "../core/services/users-resolver.service";
import { UserTeamsResolverService } from "../core/services/user-teams-resolver.service";

const routes: Routes = [
  {
    path: "",
    component: ProfileComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileRoutingModule {}
