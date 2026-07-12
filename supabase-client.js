(() => {
  "use strict";

  const config = window.IFCIS_CONFIG || {};
  const configured =
    typeof config.SUPABASE_URL === "string" &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.SUPABASE_URL) &&
    typeof config.SUPABASE_PUBLISHABLE_KEY === "string" &&
    !config.SUPABASE_PUBLISHABLE_KEY.startsWith("TU_");

  const client = configured && window.supabase
    ? window.supabase.createClient(
        config.SUPABASE_URL,
        config.SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: "ifcis-auth"
          },
          global: {
            headers: { "x-application-name": "ifcis-web" }
          }
        }
      )
    : null;

  const text = value => String(value ?? "").trim();

  const safeImageUrl = value => {
    const raw = text(value);
    if (!raw) return "";
    if (raw.startsWith("assets/")) return raw;

    try {
      const url = new URL(raw, location.origin);
      const allowedHost = configured
        ? new URL(config.SUPABASE_URL).hostname
        : location.hostname;

      if (
        (url.protocol === "https:" || url.origin === location.origin) &&
        (url.hostname === allowedHost || url.origin === location.origin)
      ) {
        return url.href;
      }
    } catch {}
    return "";
  };

  const el = (tag, options = {}, children = []) => {
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(options)) {
      if (value == null) continue;
      if (key === "className") node.className = value;
      else if (key === "text") node.textContent = String(value);
      else if (key === "dataset") {
        for (const [dataKey, dataValue] of Object.entries(value)) {
          node.dataset[dataKey] = String(dataValue);
        }
      } else if (key === "attrs") {
        for (const [attr, attrValue] of Object.entries(value)) {
          node.setAttribute(attr, String(attrValue));
        }
      } else if (key === "on") {
        for (const [event, handler] of Object.entries(value)) {
          node.addEventListener(event, handler);
        }
      } else if (key in node && key !== "style") {
        node[key] = value;
      } else {
        node.setAttribute(key, String(value));
      }
    }

    for (const child of [].concat(children)) {
      if (child == null) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  };

  const setBusy = (button, busy, busyText = "PROCESANDO...") => {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = busyText;
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  };

  window.IFCIS = Object.freeze({
    config,
    configured,
    client,
    el,
    text,
    safeImageUrl,
    setBusy
  });
})();
