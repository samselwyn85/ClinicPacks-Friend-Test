(function () {
  const CLINIC = {
    name: "Harbour Physio",
    suburb: "Grey Lynn",
    phoneDisplay: "09 555 0142",
    phoneHref: "tel:+6495550142",
    brand: "ClinicPacks friend test"
  };

  const state = {
    packId: null,
    pack: null,
    redflag: null,
    selfcare: null,
    whoHelps: null,
    disclaimer: null,
    answers: {},
    step: "splash"
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  function packIdFromPath() {
    const m = location.pathname.match(/\/p\/(P0[15])\/?$/i);
    if (m) return m[1].toUpperCase();
    const q = new URLSearchParams(location.search).get("id");
    if (q && /^P0[15]$/i.test(q)) return q.toUpperCase();
    return null;
  }

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load " + path);
    return res.json();
  }

  async function boot() {
    const root = $("#app");
    if (!root) return;
    const id = packIdFromPath();
    if (!id) {
      root.innerHTML = `<div class="card"><h2>Pack not found</h2><p class="muted">Choose a journey from the <a href="/">friend test landing</a>.</p></div>`;
      return;
    }
    state.packId = id;
    try {
      const file = id === "P01" ? "pack-P01-low-back.json" : "pack-P05-leg-dominant.json";
      const [pack, redflag, selfcare, whoHelps, disclaimer] = await Promise.all([
        loadJSON("/data/" + file),
        loadJSON("/data/shared-redflag-approved-A.json"),
        loadJSON("/data/shared-selfcare-approved-B.json"),
        loadJSON("/data/shared-who-helps-nz.json"),
        loadJSON("/data/shared-disclaimer.json")
      ]);
      state.pack = pack;
      state.redflag = redflag;
      state.selfcare = selfcare;
      state.whoHelps = whoHelps;
      state.disclaimer = disclaimer;
      render();
    } catch (err) {
      root.innerHTML = `<div class="card"><h2>Couldn’t load pack</h2><p class="muted">${err.message}</p></div>`;
    }
  }

  function setStep(step) {
    state.step = step;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function rfItems() {
    const items = state.redflag.gate.items.slice();
    if (state.pack.modules && state.pack.modules.include_spine_extra_rf && state.redflag.gate.spine_extra_item) {
      items.push(state.redflag.gate.spine_extra_item);
    }
    return items;
  }

  function anyYes() {
    return rfItems().some((it) => state.answers[it.id] === "yes");
  }

  function allAnswered() {
    return rfItems().every((it) => state.answers[it.id] === "yes" || state.answers[it.id] === "no");
  }

  function progressDots(active) {
    const steps = ["splash", "shared", "safety", "result"];
    return `<div class="progress" aria-hidden="true">${steps.map((s, i) => `<i class="${i <= active ? "on" : ""}"></i>`).join("")}</div>`;
  }

  function shell(inner, stepIndex) {
    return `
      <header class="topbar">
        <a class="brand" href="/">
          <div class="brand-mark">HP</div>
          <div class="brand-text">
            <strong>${CLINIC.name}</strong>
            <span>${CLINIC.suburb} · ClinicPacks</span>
          </div>
        </a>
        <div class="topbar-actions">
          <a class="help-link" href="/guide.html">Help</a>
          <span class="chip">${state.disclaimer.strings.footer_chip}</span>
        </div>
      </header>
      ${progressDots(stepIndex)}
      ${inner}
      <p class="footer-chip">${state.disclaimer.strings.footer_chip}</p>
    `;
  }

  function renderSplash() {
    return shell(`
      <section class="screen active">
        <div class="hero">
          <div class="chip" style="margin-bottom:10px">Shared education pack</div>
          <h1>${state.pack.everyday_title}</h1>
          <p>${state.pack.clinical_subtitle}</p>
        </div>
        <p class="step-help">Next: a short “from your clinician” screen, then a safety check. Tap Continue when ready. <a href="/guide.html">How this works</a></p>
        <div class="card">
          <p class="small muted">${state.disclaimer.strings.modal_or_about}</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" data-go="shared">Continue</button>
          <a class="btn btn-secondary" href="/">Back to friend test</a>
        </div>
      </section>
    `, 0);
  }

  function renderShared() {
    return shell(`
      <section class="screen active">
        <div class="hero">
          <h1>From your clinician</h1>
          <p>${CLINIC.name} ${CLINIC.suburb} shared this pack to help you learn about common patterns — not to diagnose you.</p>
        </div>
        <div class="card">
          <div class="section-label">Pack</div>
          <h2 style="margin:0 0 6px">${state.pack.everyday_title}</h2>
          <p class="muted small">${state.pack.id} · frozen copy ${state.pack.version}</p>
          <p style="margin:12px 0 0">${state.disclaimer.strings.results_subhead}</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" data-go="safety">Start safety check</button>
          <button class="btn btn-ghost" data-go="splash">Back</button>
        </div>
      </section>
    `, 1);
  }

  function renderSafety() {
    const items = rfItems().map((it) => {
      const ans = state.answers[it.id];
      return `
        <div class="rf-item" data-rf="${it.id}">
          <p>${it.label_full}</p>
          <div class="rf-toggle" role="group" aria-label="${it.label_short}">
            <button type="button" class="yes ${ans === "yes" ? "on" : ""}" data-ans="yes" data-id="${it.id}">Yes</button>
            <button type="button" class="no ${ans === "no" ? "on" : ""}" data-ans="no" data-id="${it.id}">No</button>
          </div>
        </div>`;
    }).join("");

    return shell(`
      <section class="screen active">
        <div class="hero">
          <h1>${state.redflag.gate.screen_title}</h1>
          <p>${state.redflag.gate.intro}</p>
        </div>
        <p class="step-help">Answer Yes or No for each item. For the friend test: try one Yes (hard stop), then all No (results). <a href="/guide.html">How this works</a></p>
        <div class="card" style="padding-top:4px;padding-bottom:4px">${items}</div>
        <div class="btn-row">
          <button class="btn btn-primary" id="rf-continue" ${allAnswered() ? "" : "disabled"} style="${allAnswered() ? "" : "opacity:.5"}">
            ${state.redflag.gate.none_cta} / Continue
          </button>
          <button class="btn btn-ghost" data-go="shared">Back</button>
        </div>
        <p class="small muted" style="margin-top:12px">Any “Yes” goes to urgent guidance. Find-a-physio is hidden on that screen.</p>
      </section>
    `, 2);
  }

  function renderHardStop() {
    const hs = state.redflag.hard_stop_screen;
    const actions = hs.actions.map((a) => {
      if (a.href) {
        return `<a href="${a.href}">${a.label}</a>`;
      }
      return `<div class="action">${a.label}</div>`;
    }).join("");

    return shell(`
      <section class="screen active">
        <div class="stop-card">
          <h2>${hs.title}</h2>
          <p><strong>${hs.lead}</strong></p>
          <p>${hs.body}</p>
          <div class="action-list">${actions}</div>
          <div class="clinic-phone">
            Clinic phone (Harbour Physio Grey Lynn):
            <a href="${CLINIC.phoneHref}"><strong>${CLINIC.phoneDisplay}</strong></a>
          </div>
          <p class="small" style="margin-top:14px">${hs.calm_closer}</p>
          <p class="small muted">${hs.disclaimer_line}</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-secondary" data-go="safety">${hs.back_link}</button>
        </div>
        <p class="small muted">Find a physio is not shown here by design.</p>
      </section>
    `, 2);
  }

  function renderResults() {
    const p = state.pack;
    const sc = state.selfcare;
    const wh = state.whoHelps;
    const bullets = sc.bullets.slice();
    if (p.modules && p.modules.include_optional_imaging_line && sc.optional_fifth_if_space) {
      bullets.push(sc.optional_fifth_if_space);
    }
    const trusted = (p.trusted_links || []).map((l) => `
      <a href="${l.url}" target="_blank" rel="noopener noreferrer">
        ${l.label}
        ${l.caveat ? `<span>${l.caveat}</span>` : (l.tier ? `<span>${l.tier.replace(/_/g, " ")}</span>` : "")}
      </a>`).join("");

    const helpLinks = (wh.links || [])
      .filter((l) => l.show_when !== "injury_onset" || true)
      .map((l) => `<a href="${l.url}" ${l.url.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}>${l.label}</a>`)
      .join("");

    return shell(`
      <section class="screen active">
        <div class="hero">
          <div class="chip" style="margin-bottom:10px">${p.id}</div>
          <h1>${p.results_header}</h1>
          <p>${state.disclaimer.strings.results_subhead}</p>
        </div>

        <div class="card">
          <h2>${p.everyday_title}</h2>
          <p>${p.why_it_might_fit}</p>
        </div>

        <div class="section-label">What people notice</div>
        <div class="card"><ul class="list">${p.what_people_notice.map((x) => `<li>${x}</li>`).join("")}</ul></div>

        <div class="section-label">Could also be</div>
        <div class="card"><ul class="list">${p.could_also_be.map((x) => `<li>${x}</li>`).join("")}</ul></div>

        <div class="section-label">What this is not</div>
        <div class="card"><ul class="list">${p.what_this_is_not.map((x) => `<li>${x}</li>`).join("")}</ul></div>

        <div class="card">
          <h3>What to expect</h3>
          <p>${p.settle_expectation}</p>
        </div>

        ${(p.soft_flags || []).map((f) => `
          <div class="banner-soft">
            <strong>${wh.soft_banner.title}</strong>
            <span class="small">${f}</span>
          </div>`).join("")}

        <div class="section-label">${sc.section_title}</div>
        <div class="card">
          <p class="small muted">${sc.intro}</p>
          <ul class="list">${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
        </div>

        <div class="section-label">${wh.section_title}</div>
        <div class="card">
          <p>${wh.body}</p>
          <p class="small"><strong>${wh.soft_when_to_get_help.title}:</strong> ${wh.soft_when_to_get_help.soon} ${wh.soft_when_to_get_help.now}</p>
          <div class="link-list" style="margin-top:12px">${helpLinks}</div>
        </div>

        <div class="section-label">Trusted links</div>
        <div class="link-list">${trusted}</div>

        <div class="card" style="margin-top:16px">
          <p class="small muted">${state.disclaimer.strings.results_footer}</p>
          <p class="small muted">Clinic: <a href="${CLINIC.phoneHref}">${CLINIC.name} · ${CLINIC.phoneDisplay}</a></p>
        </div>

        <div class="btn-row">
          <a class="btn btn-secondary" href="/">Back to friend test</a>
          <button class="btn btn-ghost" data-go="safety">Review safety answers</button>
        </div>
      </section>
    `, 3);
  }

  function render() {
    const root = $("#app");
    let html = "";
    if (state.step === "splash") html = renderSplash();
    else if (state.step === "shared") html = renderShared();
    else if (state.step === "safety") html = renderSafety();
    else if (state.step === "hardstop") html = renderHardStop();
    else if (state.step === "results") html = renderResults();
    root.innerHTML = html;
    bind();
  }

  function bind() {
    $$("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => setStep(btn.getAttribute("data-go")));
    });
    $$(".rf-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        const ans = btn.getAttribute("data-ans");
        state.answers[id] = ans;
        render();
      });
    });
    const cont = $("#rf-continue");
    if (cont) {
      cont.addEventListener("click", () => {
        if (!allAnswered()) return;
        if (anyYes()) setStep("hardstop");
        else setStep("results");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
