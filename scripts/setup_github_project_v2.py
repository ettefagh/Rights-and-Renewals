"""
Automated GitHub Projects (v2) Board Setup & Population Script for `ettefagh/CM-LAB` (Team 6).
Creates "Team 6 — Warranty, Subscription & Tax-Ready Wallet" on GitHub Projects (v2),
links it to `ettefagh/CM-LAB`, configures custom fields:
  - Status (5 Kanban columns: Backlog, Ready (Sprint 1), In Progress [WIP <= 2], In Review / QA, Done)
  - Team 6 Owner (5 named Team 6 leads: Jeetkumar, AmirHossein, Prushti, Kyle, Mojtaba)
  - MoSCoW Priority (Must-Have, Should-Have, Could-Have, Won't-Have in MVP)
  - Story Points (Numeric effort)
Adds all 30 repository issues (#1 to #30), and populates every single item's Status, Assigned Owner,
MoSCoW Priority, and Story Points!

Prerequisite:
Ensure your `gh` CLI token includes `project` scope:
    gh auth refresh -h github.com -s project,read:project
"""

import json
import subprocess
import sys

OWNER = "ettefagh"
REPO = "CM-LAB"
PROJECT_TITLE = "Team 6 — Warranty, Subscription & Tax-Ready Wallet"

STATUS_OPTIONS = [
    {"name": "1. Backlog", "color": "GRAY", "description": "Product & Sprint Backlog (Should-Have, Could-Have, Won't-Have)"},
    {"name": "2. Ready (Sprint 1)", "color": "BLUE", "description": "Committed for Active Session 5 Sprint Gate"},
    {"name": "3. In Progress (WIP <= 2)", "color": "YELLOW", "description": "Actively being built (Strict WIP limit <= 2 per member)"},
    {"name": "4. In Review / QA", "color": "PURPLE", "description": "Awaiting 7-Gate Definition of Done & QA verification"},
    {"name": "5. Done", "color": "GREEN", "description": "100% Definition of Done verified & closed"}
]

LABEL_TO_STATUS = {
    "column: 1-backlog": "1. Backlog",
    "column: 2-ready-sprint-1": "2. Ready (Sprint 1)",
    "column: 3-in-progress": "3. In Progress (WIP <= 2)",
    "column: 4-in-review-qa": "4. In Review / QA",
    "column: 5-done": "5. Done"
}

MEMBER_OPTIONS = [
    {"name": "Jeetkumar (Project Manager)", "color": "YELLOW", "description": "Team 6 Project Manager"},
    {"name": "AmirHossein (Product / Research Lead)", "color": "BLUE", "description": "Team 6 Product / Research Lead (@ettefagh)"},
    {"name": "Prushti (UX/UI Lead)", "color": "ORANGE", "description": "Team 6 UX/UI Lead"},
    {"name": "Kyle (Development Lead)", "color": "GREEN", "description": "Team 6 Development Lead"},
    {"name": "Mojtaba (Quality / Media Lead)", "color": "PURPLE", "description": "Team 6 Quality / Media Lead"}
]

ISSUE_PRIMARY_OWNER = {
    1: "Prushti (UX/UI Lead)",
    2: "Kyle (Development Lead)",
    3: "Mojtaba (Quality / Media Lead)",
    4: "Prushti (UX/UI Lead)",
    5: "Mojtaba (Quality / Media Lead)",
    6: "Kyle (Development Lead)",
    7: "Prushti (UX/UI Lead)",
    8: "Mojtaba (Quality / Media Lead)",
    9: "AmirHossein (Product / Research Lead)",
    10: "Kyle (Development Lead)",
    11: "AmirHossein (Product / Research Lead)",
    12: "Kyle (Development Lead)",
    13: "Kyle (Development Lead)",
    14: "AmirHossein (Product / Research Lead)",
    15: "AmirHossein (Product / Research Lead)",
    16: "Kyle (Development Lead)",
    17: "Jeetkumar (Project Manager)",
    18: "Kyle (Development Lead)",
    19: "Mojtaba (Quality / Media Lead)",
    20: "AmirHossein (Product / Research Lead)",
    21: "AmirHossein (Product / Research Lead)",
    22: "Prushti (UX/UI Lead)",
    23: "Prushti (UX/UI Lead)",
    24: "Prushti (UX/UI Lead)",
    25: "Kyle (Development Lead)",
    26: "Prushti (UX/UI Lead)",
    27: "Jeetkumar (Project Manager)",
    28: "AmirHossein (Product / Research Lead)",
    29: "AmirHossein (Product / Research Lead)",
    30: "Jeetkumar (Project Manager)"
}

PRIORITY_OPTIONS = [
    {"name": "Must-Have (MVP)", "color": "GREEN", "description": "Core Session 5 MVP Requirement"},
    {"name": "Should-Have", "color": "BLUE", "description": "Session 6 Expansion"},
    {"name": "Could-Have", "color": "PURPLE", "description": "Session 7 Enhancement"},
    {"name": "Won't-Have (MVP)", "color": "GRAY", "description": "Explicitly Deferred to Phase 2"}
]

LABEL_TO_PRIORITY = {
    "priority: must-have": "Must-Have (MVP)",
    "priority: should-have": "Should-Have",
    "priority: could-have": "Could-Have",
    "priority: wont-have-mvp": "Won't-Have (MVP)"
}

LABEL_TO_SP = {
    "sp: 3": 3.0,
    "sp: 5": 5.0,
    "sp: 8": 8.0,
    "sp: 10": 10.0,
    "sp: 13": 13.0
}

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
    out = json.loads(proc.stdout.decode("utf-8", errors="replace"))
    if "errors" in out:
        print(f"[WARN] GraphQL returned errors: {out['errors']}")
    return out

def main():
    print(f"=== Setting up GitHub Projects (v2) Board: {PROJECT_TITLE} ===")
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

    project = next((p for p in existing_projects if "Warranty" in p["title"] or "Team 6" in p["title"] or "CM-LAB" in p["title"]), None)
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

    q_update_proj = """
    mutation($projectId: ID!, $title: String!, $shortDesc: String!, $readme: String!) {
      updateProjectV2(input: {
        projectId: $projectId,
        title: $title,
        shortDescription: $shortDesc,
        readme: $readme,
        public: true
      }) {
        projectV2 { id url }
      }
    }
    """
    readme_text = (
        "# 🛡️ Team 6 — Warranty, Subscription & Tax-Ready Wallet (SRH WiSe 2026)\n\n"
        "Official 5-Column Agile Kanban Board for **Team 6** in *Computer & Media Lab* (Prof. Franziska Schwarz).\n\n"
        "### 👥 Team 6 Roster & Role Assignments\n"
        "- **Project Manager:** Jeetkumar\n"
        "- **Product / Research Lead:** AmirHossein (`@ettefagh`)\n"
        "- **UX/UI Lead:** Prushti\n"
        "- **Development Lead:** Kyle\n"
        "- **Quality / Media Lead:** Mojtaba\n"
    )
    run_graphql(q_update_proj, {
        "projectId": project_id,
        "title": PROJECT_TITLE,
        "shortDesc": "Team 6 — 5-Column Agile Kanban Board | SRH Computer & Media Lab (WiSe 2026)",
        "readme": readme_text
    })

    q_link = """
    mutation($projectId: ID!, $repositoryId: ID!) {
      linkProjectV2ToRepository(input: {projectId: $projectId, repositoryId: $repositoryId}) {
        repository { id }
      }
    }
    """
    run_graphql(q_link, {"projectId": project_id, "repositoryId": repo_id})

    q_fields = """
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              ... on ProjectV2Field { id name dataType }
              ... on ProjectV2SingleSelectField {
                id
                name
                dataType
                options { id name }
              }
            }
          }
        }
      }
    }
    """
    f_res = run_graphql(q_fields, {"projectId": project_id})
    fields = f_res["data"]["node"]["fields"]["nodes"]
    field_map = {f["name"]: f for f in fields if "name" in f}

    if "Status" in field_map:
        status_field_id = field_map["Status"]["id"]
        q_upd_status = """
        mutation($fieldId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
          updateProjectV2Field(input: {
            fieldId: $fieldId,
            name: "Status",
            singleSelectOptions: $options
          }) {
            projectV2Field {
              ... on ProjectV2SingleSelectField {
                id
                options { id name }
              }
            }
          }
        }
        """
        s_upd = run_graphql(q_upd_status, {"fieldId": status_field_id, "options": STATUS_OPTIONS})
        if s_upd and "data" in s_upd and s_upd["data"].get("updateProjectV2Field"):
            field_map["Status"] = s_upd["data"]["updateProjectV2Field"]["projectV2Field"]
            print("Configured 5 Kanban columns on Status field.")

    if "Team 6 Owner" not in field_map:
        q_create_owner_field = """
        mutation($projectId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
          createProjectV2Field(input: {
            projectId: $projectId,
            dataType: SINGLE_SELECT,
            name: "Team 6 Owner",
            singleSelectOptions: $options
          }) {
            projectV2Field {
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
            }
          }
        }
        """
        o_res = run_graphql(q_create_owner_field, {"projectId": project_id, "options": MEMBER_OPTIONS})
        if o_res and "data" in o_res and o_res["data"].get("createProjectV2Field"):
            field_map["Team 6 Owner"] = o_res["data"]["createProjectV2Field"]["projectV2Field"]
            print("Created 'Team 6 Owner' custom field with 5 named members.")

    if "MoSCoW Priority" not in field_map:
        q_create_prio_field = """
        mutation($projectId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
          createProjectV2Field(input: {
            projectId: $projectId,
            dataType: SINGLE_SELECT,
            name: "MoSCoW Priority",
            singleSelectOptions: $options
          }) {
            projectV2Field {
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
            }
          }
        }
        """
        p_res = run_graphql(q_create_prio_field, {"projectId": project_id, "options": PRIORITY_OPTIONS})
        if p_res and "data" in p_res and p_res["data"].get("createProjectV2Field"):
            field_map["MoSCoW Priority"] = p_res["data"]["createProjectV2Field"]["projectV2Field"]
            print("Created 'MoSCoW Priority' custom field.")

    if "Story Points" not in field_map:
        q_create_sp_field = """
        mutation($projectId: ID!) {
          createProjectV2Field(input: {
            projectId: $projectId,
            dataType: NUMBER,
            name: "Story Points"
          }) {
            projectV2Field {
              ... on ProjectV2Field { id name }
            }
          }
        }
        """
        sp_res = run_graphql(q_create_sp_field, {"projectId": project_id})
        if sp_res and "data" in sp_res and sp_res["data"].get("createProjectV2Field"):
            field_map["Story Points"] = sp_res["data"]["createProjectV2Field"]["projectV2Field"]
            print("Created 'Story Points' number field.")

    status_opt_map = {opt["name"]: opt["id"] for opt in field_map.get("Status", {}).get("options", [])}
    owner_opt_map = {opt["name"]: opt["id"] for opt in field_map.get("Team 6 Owner", {}).get("options", [])}
    prio_opt_map = {opt["name"]: opt["id"] for opt in field_map.get("MoSCoW Priority", {}).get("options", [])}

    q_add_item = """
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item { id }
      }
    }
    """

    q_set_single_select = """
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId,
        itemId: $itemId,
        fieldId: $fieldId,
        value: { singleSelectOptionId: $optionId }
      }) {
        projectV2Item { id }
      }
    }
    """

    q_set_number = """
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $num: Float!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId,
        itemId: $itemId,
        fieldId: $fieldId,
        value: { number: $num }
      }) {
        projectV2Item { id }
      }
    }
    """

    for iss in issues:
        num = iss["number"]
        lbls = [n["name"] for n in iss["labels"]["nodes"]]
        add_res = run_graphql(q_add_item, {"projectId": project_id, "contentId": iss["id"]})
        if not add_res or "data" not in add_res or not add_res["data"].get("addProjectV2ItemById"):
            continue
        item_id = add_res["data"]["addProjectV2ItemById"]["item"]["id"]

        for lbl, st_name in LABEL_TO_STATUS.items():
            if lbl in lbls and st_name in status_opt_map:
                run_graphql(q_set_single_select, {
                    "projectId": project_id,
                    "itemId": item_id,
                    "fieldId": field_map["Status"]["id"],
                    "optionId": status_opt_map[st_name]
                })
                break

        owner_name = ISSUE_PRIMARY_OWNER.get(num)
        if owner_name and owner_name in owner_opt_map and "Team 6 Owner" in field_map:
            run_graphql(q_set_single_select, {
                "projectId": project_id,
                "itemId": item_id,
                "fieldId": field_map["Team 6 Owner"]["id"],
                "optionId": owner_opt_map[owner_name]
            })

        for lbl, pr_name in LABEL_TO_PRIORITY.items():
            if lbl in lbls and pr_name in prio_opt_map and "MoSCoW Priority" in field_map:
                run_graphql(q_set_single_select, {
                    "projectId": project_id,
                    "itemId": item_id,
                    "fieldId": field_map["MoSCoW Priority"]["id"],
                    "optionId": prio_opt_map[pr_name]
                })
                break

        for lbl, sp_val in LABEL_TO_SP.items():
            if lbl in lbls and "Story Points" in field_map:
                run_graphql(q_set_number, {
                    "projectId": project_id,
                    "itemId": item_id,
                    "fieldId": field_map["Story Points"]["id"],
                    "num": sp_val
                })
                break

        print(f"Populated Project Item #{num} ({owner_name}): {iss['title']}")

    print(f"\n=== Successfully populated Team 6 GitHub Project v2 Board: {project['url']} ===")

if __name__ == "__main__":
    main()
