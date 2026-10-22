"use strict";

const STORAGE_KEY = "campusCafeMenus";
const initialMenus = [
  {
    id: "americano",
    name: "아메리카노",
    description: "깔끔하고 깊은 풍미의 클래식 커피",
    price: 3000,
    stock: 12,
    icon: "☕",
    color: "#eee5d8"
  },
  {
    id: "cafe-latte",
    name: "카페라떼",
    description: "부드러운 우유와 에스프레소의 조화",
    price: 4000,
    stock: 10,
    icon: "🥛",
    color: "#eee8dc"
  },
  {
    id: "vanilla-latte",
    name: "바닐라라떼",
    description: "은은한 바닐라 향을 더한 라떼",
    price: 4500,
    stock: 8,
    icon: "🍦",
    color: "#f2e8d5"
  },
  {
    id: "cappuccino",
    name: "카푸치노",
    description: "폭신한 우유 거품을 올린 커피",
    price: 4000,
    stock: 8,
    icon: "☕",
    color: "#e9e5dc"
  },
  {
    id: "chocolate-latte",
    name: "초코라떼",
    description: "달콤한 초콜릿으로 채운 한 잔",
    price: 4500,
    stock: 10,
    icon: "🍫",
    color: "#f0e2d9"
  }
];

const menuGrid = document.querySelector("#menu-grid");
const stockList = document.querySelector("#stock-list");
const message = document.querySelector("#app-message");
const viewButtons = document.querySelectorAll("[data-view]");
const viewPanels = document.querySelectorAll("[data-panel]");

function isValidMenuList(value) {
  return Array.isArray(value)
    && value.length === initialMenus.length
    && value.every((menu) =>
      menu
      && typeof menu.id === "string"
      && Number.isInteger(menu.stock)
      && menu.stock >= 0
      && initialMenus.some((initialMenu) => initialMenu.id === menu.id)
    )
    && new Set(value.map((menu) => menu.id)).size === initialMenus.length;
}

function loadMenus() {
  const savedMenus = localStorage.getItem(STORAGE_KEY);

  if (savedMenus === null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMenus));
    return initialMenus;
  }

  const menus = JSON.parse(savedMenus);
  if (!isValidMenuList(menus)) {
    throw new Error("저장된 메뉴 데이터의 형식이 올바르지 않습니다.");
  }

  return initialMenus.map((initialMenu) => ({
    ...initialMenu,
    stock: menus.find((menu) => menu.id === initialMenu.id).stock
  }));
}

function formatPrice(price) {
  return `${price.toLocaleString("ko-KR")}원`;
}

function createMenuCard(menu) {
  const card = document.createElement("article");
  const soldOut = menu.stock === 0;
  card.className = "menu-card";
  card.innerHTML = `
    <div class="menu-card-top">
      <span class="drink-illustration" style="--drink-bg: ${menu.color}" aria-hidden="true">${menu.icon}</span>
      <span class="stock-badge${soldOut ? " is-sold-out" : ""}">
        ${soldOut ? "품절" : `재고 ${menu.stock}개`}
      </span>
    </div>
    <h3>${menu.name}</h3>
    <p class="menu-description">${menu.description}</p>
    <p class="menu-price">${formatPrice(menu.price)} <span>/ 기본</span></p>
    <div class="option-area" aria-label="${menu.name} 옵션 선택">
      <span class="option-title">추가 옵션</span>
      <label class="option-label">
        <input type="checkbox" name="shot-${menu.id}" ${soldOut ? "disabled" : ""}>
        샷 추가
        <span class="option-price">+500원</span>
      </label>
      <label class="option-label">
        <input type="checkbox" name="syrup-${menu.id}" ${soldOut ? "disabled" : ""}>
        시럽 추가
        <span class="option-price">+0원</span>
      </label>
    </div>
  `;
  return card;
}

function renderMenus(menus) {
  menuGrid.replaceChildren(...menus.map(createMenuCard));
  document.querySelector("#menu-count").textContent = String(menus.length);
  document.querySelector("#stock-count").textContent = String(menus.length);
  stockList.replaceChildren(...menus.map((menu) => {
    const row = document.createElement("div");
    row.className = "stock-row";
    row.innerHTML = `
      <span class="stock-menu-name">
        <span class="stock-menu-icon" style="--drink-bg: ${menu.color}" aria-hidden="true">${menu.icon}</span>
        ${menu.name}
      </span>
      <span class="stock-quantity">${menu.stock === 0 ? "품절" : `<strong>${menu.stock}</strong> 잔`}</span>
    `;
    return row;
  }));
}

function switchView(viewName) {
  viewPanels.forEach((panel) => {
    const isActive = panel.dataset.panel === viewName;
    panel.hidden = !isActive;
  });

  viewButtons.forEach((button) => {
    const isActive = button.dataset.view === viewName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

try {
  renderMenus(loadMenus());
} catch (error) {
  message.hidden = false;
  message.textContent = `화면을 불러오지 못했습니다. 브라우저 저장 공간을 확인해 주세요. (${error.message})`;
  viewButtons.forEach((button) => {
    button.disabled = true;
  });
}
