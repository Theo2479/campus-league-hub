# [cite_start]Sporting Leagues and Systems App [cite: 1]

## Project Overview
[cite_start]This application serves as a central platform for teams, leagues, and referees to participate within the league system[cite: 3]. [cite_start]The primary goal is to ensure live, seamless usage that allows the sporting intramural system to run efficiently[cite: 4].

## User Roles
[cite_start]The system is built around three distinct account types[cite: 5]:

* [cite_start]**Admin:** Has full control, power, and access to everything on the app[cite: 7]. [cite_start]Admins are responsible for managing all leagues, divisions, and accounts[cite: 13, 60].
* [cite_start]**Captains:** In charge of their associated team[cite: 9]. [cite_start]They can view team status, fixtures, and standings[cite: 51].
* [cite_start]**Refs (Referees):** Work as officials for the league system[cite: 11]. [cite_start]They fill in scores at the end of games[cite: 49].

---

## Core Workflows

### 1. League Setup & Initialization
* [cite_start]**Sign Up:** Teams and refs sign up outside of the app at the start of the season[cite: 14].
* [cite_start]**Account Creation:** The Admin creates all team, captain, and ref accounts[cite: 15, 16]. [cite_start]Captains are linked to their corresponding teams[cite: 15].
* [cite_start]**Structure:** Admins create leagues (e.g., Saturday League) and divisions (e.g., Div 1, Div 2) and add teams to them[cite: 17, 19, 20].
* **Fixtures:**
    * [cite_start]Admins input pitch availability for venues[cite: 33].
    * [cite_start]Fixtures are generated in a round-robin style for all teams in a division[cite: 35].
    * [cite_start]Admins can view division overviews, and Captains can see their specific fixtures[cite: 36, 37].

### 2. Referee Allocation
* [cite_start]**Availability:** Admins open an allocation form for a specific window; refs indicate availability for games in that window[cite: 38].
* [cite_start]**Allocation:** Once the form closes, Admins run a formula to assign refs to games[cite: 39, 40].
* [cite_start]**Notification:** Refs are notified of their assignments, and Captains are notified of their upcoming referee[cite: 41, 42].
* [cite_start]**Communication:** A group chat is automatically created containing the two Captains and the assigned Ref[cite: 43].

---

## Key Features & Protocols

### Postponements & Forfeits
* [cite_start]**Postponement (>72 Hours):** Captains can request a postponement if it is more than 72 hours before kick-off[cite: 52].
    * [cite_start]The Admin accepts or denies the request[cite: 53].
    * [cite_start]If accepted, the fixture is moved to the back of the list for rescheduling[cite: 54].
* [cite_start]**Forfeit (<72 Hours):** If the request is within 72 hours of kick-off, it becomes a forfeit[cite: 56].
    * [cite_start]Notifications are sent to the Ref, Admin, and opposition[cite: 56].
    * [cite_start]**Penalty:** The opposing team receives an automatic 3-0 win, and the forfeiting team receives a -3 points penalty[cite: 56].

### Ref Drop-out Protocol
* [cite_start]If a Ref drops out, the Admin and Captains are notified[cite: 46].
* [cite_start]**Free Game Protocol:** A notification is sent to all refs allowing them to pick up the game[cite: 47].
* **Assignment:** This is first-come, first-served. [cite_start]The new Ref automatically replaces the old Ref in the group chat[cite: 48].

### Additional Features
* [cite_start]**Friendly Market:** Captains can indicate interest in friendly matches via a dedicated tab[cite: 57, 58]. [cite_start]Matches are organized via a group chat with the Admin[cite: 58].
* [cite_start]**Emergency Cancellations:** Admins can mass-cancel games for a specific day[cite: 66, 67]. [cite_start]These games are marked as "postponed" and added back to the fixture list[cite: 67].

---

## Communication Architecture
[cite_start]The app features a chat function with strict privilege controls[cite: 69, 70].

| User Role | Chat Privileges |
| :--- | :--- |
| **Admin** | [cite_start]Can create/delete individual and group chats with any user[cite: 72]. |
| **Ref** | Cannot create chats. [cite_start]Can only participate in chats they are added to (e.g., fixture chats) or their auto-chat with the Admin[cite: 74, 75]. |
| **Captain** | [cite_start]Can create chats with other Captains (but not Refs)[cite: 77]. [cite_start]Has an automatic chat with the Admin[cite: 78]. |

[cite_start]**Announcements Channel:** A section visible only to Admins and Captains (Refs cannot see this) for league news[cite: 79, 80].

---

## Technical Guidelines

### Development Principles
* [cite_start]**UX:** The app must be seamless and easy to navigate[cite: 88].
* [cite_start]**Modularity:** Code must be highly modular to allow for easy upgrading and scaling (e.g., adding new user types)[cite: 89, 90].
* [cite_start]**Security:** While no specific measures are currently implemented, the architecture must support the easy addition of security features later[cite: 91, 92].

### Inspirations
* [cite_start]**Playwaze:** For league organization and system structure[cite: 83, 84].
* [cite_start]**Microsoft Teams:** For the chat and channel systems[cite: 85, 86].

---

## Future Roadmap
The codebase is designed to support the following future expansions:
1.  [cite_start]**Knockout Tournaments:** Admin creation of tournament brackets[cite: 94].
2.  [cite_start]**Multi-Sport Support:** Login gateways specific to different sports[cite: 95, 96].
3.  [cite_start]**Multi-University Support:** Allowing different institutions to run their own intramural systems on the platform[cite: 98, 100].
4.  [cite_start]**Integrations:** Potential integration with BUCS and Movember[cite: 101, 102].