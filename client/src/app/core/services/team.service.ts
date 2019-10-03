import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { SimpleTeamInfo } from "src/app/models/simple-team-info";
import { Team } from "src/app/models/team";

@Injectable({
  providedIn: "root"
})
export class TeamService {
  constructor(private http: HttpClient) {}
  // tslint:disable-next-line: no-unused-expression
  public getTeamInvitations(): Observable<any> {
    return;
  }

  public createNewTeam(team): Observable<any> {
    return this.http.post<any>("http://localhost:3000/api/team", team);
  }

  public leaveTeam(teamId, user): Observable<any> {
    return this.http.delete<{}>(
      `http://localhost:3000/api/team/${teamId}`,
      user
    );
  }

  public getTeamsByUserId(userId: string): Observable<SimpleTeamInfo[]> {
    return this.http.get<SimpleTeamInfo[]>(
      `http://localhost:3000/api/team/user/${userId}`
    );
  }

  public createTeamMemberInvitation(body, user): Observable<any> {
    return this.http.post<any>(
      `http://localhost:3000/api/team-invitation/`,
      body,
      user
    );
  }

  public showPendingInvitations(userId: string): Observable<any> {
    return this.http.get<any>(
      "http://localhost:3000/api/users/" + userId + "/active-invitations"
    );
  }

  public acceptInvitation(invitationId: string): Observable<any> {
    return this.http.put<{}>(
      `http://localhost:3000/api/team-invitation/${invitationId}`,
      {}
    );
  }

  public rejectInvitation(invitationId: string): Observable<any> {
    return this.http.delete<{}>(
      `http://localhost:3000/api/team-invitation/${invitationId}`
    );
  }
}
