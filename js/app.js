(function () {
  "use strict";

  var App = window.App = window.App || {};

  App.showToast = function (message, type) {
    var stack = document.getElementById("toast-stack");
    if (!stack) return;

    var toast = document.createElement("div");
    toast.className = "toast" + (type ? " is-" + type : "");
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = message;
    stack.appendChild(toast);

    window.setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transition = "opacity .2s ease";
      window.setTimeout(function () { toast.remove(); }, 220);
    }, 3200);
  };

  App.storage = {
    get: function (key) {
      try { return window.localStorage.getItem(key); } catch (error) { return null; }
    },
    set: function (key, value) {
      try { window.localStorage.setItem(key, value); } catch (error) { /* Sin almacenamiento. */ }
    },
    remove: function (key) {
      try { window.localStorage.removeItem(key); } catch (error) { /* Sin almacenamiento. */ }
    }
  };

  function activateDashboard() {
    var loginScreen = document.getElementById("screen-login");
    var shell = document.getElementById("app-shell");

    function showDashboard() {
      document.body.classList.add("app-active");
      loginScreen.classList.remove("is-active");
      shell.hidden = false;
      shell.classList.add("is-active");
      window.Store.role = "admin";
      window.Shell.boot();
      window.scrollTo(0, 0);
    }

    var stylesheet = document.getElementById("dashboard-styles");
    if (stylesheet) {
      showDashboard();
      return;
    }

    stylesheet = document.createElement("link");
    stylesheet.id = "dashboard-styles";
    stylesheet.rel = "stylesheet";
    stylesheet.href = "css/dashboard.css";
    stylesheet.addEventListener("load", showDashboard, { once: true });
    document.head.appendChild(stylesheet);
  }

  function initLogin() {
    var form = document.getElementById("login-form");
    if (!form) return;

    var userInput = document.getElementById("input-user");
    var passInput = document.getElementById("input-pass");
    var shellUser = document.getElementById("shell-user");
    var shellPass = document.getElementById("shell-pass");
    var rememberInput = document.getElementById("input-remember");
    var togglePass = document.getElementById("toggle-pass");
    var iconEye = document.getElementById("icon-eye");
    var submitButton = document.getElementById("btn-submit");

    var eyeOpen = '<path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/>';
    var eyeClosed = '<path d="M3 3l18 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c7 0 10.5 7 10.5 7a13.4 13.4 0 0 1-3.1 4.1M7.4 6.9C4.2 8.7 1.5 12 1.5 12S5 19 12 19c1.3 0 2.5-.2 3.6-.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M9.9 10a3 3 0 0 0 4.1 4.1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>';

    var rememberedUser = App.storage.get("hoc_remember_user");
    if (rememberedUser) {
      userInput.value = rememberedUser;
      rememberInput.checked = true;
    }

    togglePass.addEventListener("click", function () {
      var isVisible = passInput.type === "text";
      passInput.type = isVisible ? "password" : "text";
      togglePass.setAttribute("aria-pressed", String(!isVisible));
      togglePass.setAttribute("aria-label", isVisible ? "Mostrar contraseña" : "Ocultar contraseña");
      iconEye.innerHTML = isVisible ? eyeClosed : eyeOpen;
    });

    userInput.addEventListener("input", function () { shellUser.classList.remove("has-error"); });
    passInput.addEventListener("input", function () { shellPass.classList.remove("has-error"); });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var isValid = true;

      if (!userInput.value.trim()) {
        shellUser.classList.add("has-error");
        isValid = false;
      }
      if (!passInput.value) {
        shellPass.classList.add("has-error");
        isValid = false;
      }
      if (!isValid) {
        App.showToast("Completa tus credenciales para ingresar.", "error");
        return;
      }

      if (rememberInput.checked) App.storage.set("hoc_remember_user", userInput.value.trim());
      else App.storage.remove("hoc_remember_user");

      submitButton.classList.add("is-loading");
      submitButton.disabled = true;

      window.setTimeout(function () {
        submitButton.classList.remove("is-loading");
        submitButton.disabled = false;
        window.sessionStorage.setItem("hoc_session", "active");
        activateDashboard();
      }, 900);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.sessionStorage.getItem("hoc_session") === "active") activateDashboard();
    else initLogin();
  });
}());
