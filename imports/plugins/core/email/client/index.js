import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";

import { registerOperatorRoute } from "/imports/client/ui";

registerOperatorRoute({
  isNavigationLink: true,
  isSetting: true,
  path: "/email",
  mainComponent: Nothing,
  // eslint-disable-next-line react/display-name
  SidebarIconComponent: (props) => <FontAwesomeIcon icon={faEnvelope} {...props} />,
  sidebarI18nLabel: "admin.dashboard.emailLabel"
});

function Nothing () {
  return <div>Nothing</div>
}
