const REMEMBER_KEY = "beatstack_remember_login";
const EMAIL_KEY = "beatstack_saved_email";
const PASSWORD_KEY = "beatstack_saved_password";

function encode(value: string): string {
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return value;
  }
}

function decode(value: string): string {
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    return value;
  }
}

export function loadSavedLogin(): {
  remember: boolean;
  email: string;
  password: string;
} {
  if (typeof window === "undefined") {
    return { remember: false, email: "", password: "" };
  }
  const remember = localStorage.getItem(REMEMBER_KEY) === "1";
  if (!remember) {
    return { remember: false, email: "", password: "" };
  }
  return {
    remember: true,
    email: decode(localStorage.getItem(EMAIL_KEY) ?? ""),
    password: decode(localStorage.getItem(PASSWORD_KEY) ?? ""),
  };
}

export function persistSavedLogin(email: string, password: string, remember: boolean): void {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, "1");
    localStorage.setItem(EMAIL_KEY, encode(email));
    localStorage.setItem(PASSWORD_KEY, encode(password));
  } else {
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(PASSWORD_KEY);
  }
}
