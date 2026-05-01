import { EVENT_SLOTS } from "./data.js";

export function render(context, state) {
  context.clearRect(0, 0, state.width, state.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, state.width, state.height);
}

export function renderEvents(state, node) {
  if (node.dataset.version === String(state.eventsVersion)) {
    return;
  }

  const shouldAnimate = Boolean(node.dataset.version);
  const previousRects = getEventRects(node);

  node.dataset.version = String(state.eventsVersion);

  const entries = getEventEntries(state);
  const existing = getExistingEvents(node);

  const elements = entries.map(({ event, label, current }) => {
    const key = event.uid || `${event.id}-${label}`;
    const item = existing.get(key) || createEventElement();

    updateEventElement(item, event, label, current, key);

    return item;
  });

  node.replaceChildren(...elements);

  if (shouldAnimate) {
    animateEventShift(elements, previousRects);
  }
}

function getEventEntries(state) {
  const visibleFutureEvents = getVisibleFutureEvents(state);

  const future = visibleFutureEvents
    .map((event) => ({
      event,
      label: getEventLabel(state, event),
      current: false,
    }))
    .reverse();

  return [
    ...future,
    {
      event: state.currentEvent,
      label: "Now",
      current: true,
    },
  ];
}

function getVisibleFutureEvents(state) {
  if (state.finished) {
    return [];
  }

  return state.events
    .filter((event) => {
      return event.turnNumber >= state.turn && event.turnNumber <= state.maxTurns;
    })
    .slice(0, EVENT_SLOTS);
}

function getEventLabel(state, event) {
  if (event.type === "game-end") {
    return "Game End";
  }

  if (event.turnNumber === state.turn) {
    return "This Turn";
  }

  const distance = Math.max(1, event.turnNumber - state.turn + 1);

  return `In ${distance} turn${distance === 1 ? "" : "s"}`;
}

function getEventRects(node) {
  const rects = new Map();

  Array.from(node.children).forEach((child) => {
    rects.set(child.dataset.eventKey, child.getBoundingClientRect());
  });

  return rects;
}

function getExistingEvents(node) {
  const existing = new Map();

  Array.from(node.children).forEach((child) => {
    existing.set(child.dataset.eventKey, child);
  });

  return existing;
}

function createEventElement() {
  const item = document.createElement("div");

  const meta = document.createElement("span");
  meta.className = "pasture-event-meta";

  const title = document.createElement("strong");

  const detail = document.createElement("span");
  detail.className = "pasture-event-detail";

  item.append(meta, title, detail);

  return item;
}

function updateEventElement(item, event, label, current, key) {
  item.dataset.eventKey = key;
  item.className = `pasture-event pasture-event-${event.type}${current ? " pasture-event-current" : ""}`;

  item.querySelector(".pasture-event-meta").textContent = label;
  item.querySelector("strong").textContent = event.title;
  item.querySelector(".pasture-event-detail").textContent = event.detail;
}

function animateEventShift(elements, previousRects) {
  elements.forEach((item) => {
    const previousRect = previousRects.get(item.dataset.eventKey);
    const currentRect = item.getBoundingClientRect();

    if (previousRect) {
      const deltaY = previousRect.top - currentRect.top;

      if (Math.abs(deltaY) > 1) {
        animateElement(item, [
          {
            transform: `translateY(${deltaY}px)`,
            opacity: 1,
          },
          {
            transform: "translateY(0)",
            opacity: 1,
          },
        ]);
      }

      return;
    }

    animateElement(item, [
      {
        transform: "translateY(-110%)",
        opacity: 0,
      },
      {
        transform: "translateY(0)",
        opacity: 1,
      },
    ]);
  });
}

function animateElement(element, keyframes) {
  if (!element.animate) {
    return;
  }

  element.getAnimations().forEach((animation) => {
    animation.cancel();
  });

  element.animate(keyframes, {
    duration: 520,
    easing: "cubic-bezier(0.22, 0.9, 0.25, 1)",
  });
}