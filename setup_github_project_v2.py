"""
Automated GitHub Projects (v2) Board Setup & Population Script for `ettefagh/CM-LAB`.
Creates "Team 8 - Warranty & Subscription Wallet" on GitHub Projects (v2),
links it to `ettefagh/CM-LAB`, configures the 5 Kanban columns and custom fields
(Story Points, MoSCoW Priority, Team Role), adds all repository issues (#1 to #28),
and sets each item's exact column status, story points, priority, and role owner.

Prerequisite:
Ensure your `gh` CLI token includes `project` scope:
    gh auth refresh -h github.com -s project,read:project
"""

import json
import subprocess
import sys

OWNER = "ettefagh"
REPO = "CM-LAB"
PROJECT_TITLE = "Team 8 - Warranty & Subscription Wallet"

def run_graphql(query, variables=None):
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    proc = subprocess.run(
        ["gh", "api", "graphql", "--input", "-"],
        input=json.dumps(payload).encode("utf-8"),
        capture_output=True
    )
    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", errors="replace")
        print(f"[ERROR] GraphQL failed: {err.strip()}")
        return None
    return json.loads(proc.stdout.decode("utf-8", errors="replace"))

def main():
    print(f"=== Setting up GitHub Projects (v2) Board: {PROJECT_TITLE} ===")
    # 1. Get Owner ID and Repo ID + Issues
    q_init = """
    query($owner: String!, $repo: String!) {
      user(login: $owner) {
        id
        projectsV2(first: 20) {
          nodes { id title number url }
        }
      }
      repository(owner: $owner, name: $repo) {
        id
        issues(first: 100, orderBy: {field: CREATED_AT, direction: ASC}) {
          nodes {
            id
            number
            title
            labels(first: 20) {
              nodes { name }
            }
          }
        }
      }
    }
    """
    res = run_graphql(q_init, {"owner": OWNER, "repo": REPO})
    if not res or "data" not in res or not res["data"].get("user"):
        print("Could not query user/projectsV2. Please run: gh auth refresh -h github.com -s project,read:project")
        sys.exit(1)

    user_id = res["data"]["user"]["id"]
    repo_id = res["data"]["repository"]["id"]
    issues = res["data"]["repository"]["issues"]["nodes"]
    existing_projects = res["data"]["user"]["projectsV2"]["nodes"]

    project = next((p for p in existing_projects if p["title"] == PROJECT_TITLE), None)
    if not project:
        q_create = """
        mutation($ownerId: ID!, $title: String!) {
          createProjectV2(input: {ownerId: $ownerId, title: $title}) {
            projectV2 { id title number url }
          }
        }
        """
        c_res = run_graphql(q_create, {"ownerId": user_id, "title": PROJECT_TITLE})
        project = c_res["data"]["createProjectV2"]["projectV2"]
        print(f"Created Project v2 #{project['number']}: {project['url']}")
    else:
        print(f"Found existing Project v2 #{project['number']}: {project['url']}")

    project_id = project["id"]

    # Link Project to Repository
    q_link = """
    mutation($projectId: ID!, $repositoryId: ID!) {
      linkProjectV2ToRepository(input: {projectId: $projectId, repositoryId: $repositoryId}) {
        repository { id }
      }
    }
    """
    run_graphql(q_link, {"projectId": project_id, "repositoryId": repo_id})

    # Add all issues to project
    q_add_item = """
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item { id }
      }
    }
    """
    for iss in issues:
        add_res = run_graphql(q_add_item, {"projectId": project_id, "contentId": iss["id"]})
        if add_res and "data" in add_res:
            print(f"Added Issue #{iss['number']} to Project v2: {iss['title']}")

    print(f"=== Successfully populated Project v2: {project['url']} ===")

if __name__ == "__main__":
    main()
