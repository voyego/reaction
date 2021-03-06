import React, { Component } from "react";
import PropTypes from "prop-types";
import Random from "@reactioncommerce/random";
import { Components, registerComponent } from "@reactioncommerce/reaction-components";
import { Router } from "/client/api";

class Login extends Component {
  static propTypes = {
    credentials: PropTypes.object,
    loginFormCurrentView: PropTypes.string,
    uniqueId: PropTypes.string
  }

  static defaultProps = {
    credentials: {},
    loginFormCurrentView: "loginFormSignInView",
    get uniqueId() { return Random.id(); }
  }

  constructor(props) {
    super(props);

    const currentRoute = Router.current().route;
    const isPasswordReset = ["reset-password", "account/enroll"].includes(currentRoute.name) || currentRoute.path.includes("/reset-password/");

    this.state = {
      currentView: isPasswordReset ? "loginFormUpdatePasswordView" : props.loginFormCurrentView
    };

    this.showForgotPasswordView = this.showForgotPasswordView.bind(this);
    this.showSignUpView = this.showSignUpView.bind(this);
    this.showSignInView = this.showSignInView.bind(this);
  }

  showForgotPasswordView(event) {
    event.preventDefault();

    this.setState({
      currentView: "loginFormResetPasswordView"
    });
  }

  showSignUpView(event) {
    event.preventDefault();

    this.setState({
      currentView: "loginFormSignUpView"
    });
  }

  showSignInView(event) {
    event.preventDefault();

    this.setState({
      currentView: "loginFormSignInView"
    });
  }


  isOauthFlow(fullPath) {
    return /\/account\/login\?action/.test(fullPath)
  }

  render() {
    const currentRoute = Router.current().route;
    const isOauthFlow = currentRoute.options && currentRoute.options.meta && currentRoute.options.meta.oauthLoginFlow;
    const idpFormClass = isOauthFlow ? "idp-form" : "";
    const { currentView } = this.state;

    if (currentView === "loginFormSignInView" || currentView === "loginFormSignUpView" || currentView === "loginFormUpdatePasswordView") {
      if (this.isOauthFlow(currentRoute.fullPath)) {
        return (
          <Components.OAuthFormContainer
            credentials={this.props.credentials}
            uniqueId={this.props.uniqueId}
            onForgotPasswordClick={this.showForgotPasswordView}
          />
        );
      }
      return (
        <Components.AuthContainer
          credentials={this.props.credentials}
          uniqueId={this.props.uniqueId}
          currentView={currentView}
          onForgotPasswordClick={this.showForgotPasswordView}
          onSignUpClick={this.showSignUpView}
          onSignInClick={this.showSignInView}
        />
      );
    } else if (currentView === "loginFormResetPasswordView") {
      return (
        <Components.ForgotPassword
          credentials={this.props.credentials}
          uniqueId={this.props.uniqueId}
          currentView={currentView}
          onSignInClick={this.showSignInView}
        />
      );
    }

    return null;
  }
}

registerComponent("Login", Login);

export default Login;
