"use strict";

const STORAGE_KEY = "campusCafeMenus";
const STATE_STORAGE_KEY = "campusCafeData";
const SHOT_PRICE = 500;
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
const cartItemsElement = document.querySelector("#cart-items");
const ordersListElement = document.querySelector("#orders-list");
const message = document.querySelector("#app-message");
const placeOrderButton = document.querySelector("#place-order");
const viewButtons = document.querySelectorAll("[data-view]");
const viewPanels = document.querySelectorAll("[data-panel]");
let menus = [];
let cart = [];
let orders = [];
const selectedOptions = new Map();

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

function isValidOrders(value) {
  return Array.isArray(value) && value.every((order) =>
    order
    && typeof order.id === "string"
    && typeof order.createdAt === "string"
    && Number.isFinite(Date.parse(order.createdAt))
    && Number.isFinite(order.total)
    && Array.isArray(order.items)
    && ["접수", "제조 대기", "제조 완료"].includes(order.status)
    && order.items.every((item) =>
      item
      && initialMenus.some((menu) => menu.id === item.menuId)
      && Number.isInteger(item.quantity)
      && item.quantity > 0
      && Number.isInteger(item.unitPrice)
      && item.unitPrice >= 0
      && typeof item.name === "string"
      && typeof item.shotAdded === "boolean"
      && typeof item.syrupAdded === "boolean"
    )
  );
}

function normalizeMenus(savedMenus) {
  if (!isValidMenuList(savedMenus)) {
    throw new Error("저장된 메뉴 데이터의 형식이 올바르지 않습니다.");
  }

  return initialMenus.map((initialMenu) => ({
    ...initialMenu,
    stock: savedMenus.find((menu) => menu.id === initialMenu.id).stock
  }));
}

function loadState() {
  const savedState = localStorage.getItem(STATE_STORAGE_KEY);

  if (savedState !== null) {
    const state = JSON.parse(savedState);
    if (!state || !isValidMenuList(state.menus) || !isValidOrders(state.orders)) {
      throw new Error("저장된 주문 또는 재고 데이터의 형식이 올바르지 않습니다.");
    }

    const loadedMenus = normalizeMenus(state.menus);
    const loadedOrders = state.orders.map((order) => ({
      ...order,
      status: order.status === "접수" ? "제조 대기" : order.status
    }));
    if (state.orders.some((order) => order.status === "접수")) {
      saveState(loadedMenus, loadedOrders);
    }

    return { menus: loadedMenus, orders: loadedOrders };
  }

  const legacyMenus = localStorage.getItem(STORAGE_KEY);
  const loadedMenus = legacyMenus === null
    ? initialMenus
    : normalizeMenus(JSON.parse(legacyMenus));
  const state = { menus: loadedMenus, orders: [] };
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
  return state;
}

function saveState(nextMenus, nextOrders) {
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify({
    menus: nextMenus.map(({ id, stock }) => ({ id, stock })),
    orders: nextOrders
  }));
}

function formatPrice(price) {
  return `${price.toLocaleString("ko-KR")}원`;
}

function getCartQuantity(menuId) {
  return cart
    .filter((item) => item.menuId === menuId)
    .reduce((total, item) => total + item.quantity, 0);
}

function createMenuCard(menu) {
  const card = document.createElement("article");
  const soldOut = menu.stock === 0;
  const remaining = menu.stock - getCartQuantity(menu.id);
  const selection = selectedOptions.get(menu.id) || { shotAdded: false, syrupAdded: false };
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
        <input type="checkbox" name="shot-${menu.id}" ${selection.shotAdded ? "checked" : ""} ${soldOut ? "disabled" : ""}>
        샷 추가
        <span class="option-price">+${formatPrice(SHOT_PRICE)}</span>
      </label>
      <label class="option-label">
        <input type="checkbox" name="syrup-${menu.id}" ${selection.syrupAdded ? "checked" : ""} ${soldOut ? "disabled" : ""}>
        시럽 추가
        <span class="option-price">+0원</span>
      </label>
      <button class="add-to-cart-button" type="button" data-add-menu="${menu.id}" ${remaining <= 0 ? "disabled" : ""}>
        ${remaining <= 0 ? "장바구니에 재고만큼 담김" : "장바구니 담기"}
      </button>
    </div>
  `;
  return card;
}

function renderMenus() {
  menuGrid.replaceChildren(...menus.map(createMenuCard));
  document.querySelector("#menu-count").textContent = String(menus.length);
  document.querySelector("#stock-count").textContent = String(menus.length);
}

function renderStock() {
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

function renderCart() {
  if (cart.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "cart-empty";
    emptyMessage.textContent = "아직 담은 메뉴가 없어요. 메뉴를 골라 담아보세요.";
    cartItemsElement.replaceChildren(emptyMessage);
  } else {
    cartItemsElement.replaceChildren(...cart.map((item, index) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      const optionNames = [
        item.shotAdded ? "샷 추가" : "",
        item.syrupAdded ? "시럽 추가" : ""
      ].filter(Boolean);
      const details = optionNames.length > 0 ? optionNames.join(" · ") : "기본";
      row.innerHTML = `
        <div class="cart-item-info">
          <strong>${item.name}</strong>
          <span>${details} · ${item.quantity}잔</span>
        </div>
        <strong class="cart-item-price">${formatPrice(item.unitPrice * item.quantity)}</strong>
        <button class="remove-cart-item" type="button" data-remove-item="${index}" aria-label="${item.name} 삭제">삭제</button>
      `;
      return row;
    }));
  }

  const quantity = cart.reduce((total, item) => total + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  document.querySelector("#cart-count").textContent = String(quantity);
  document.querySelector("#cart-total").textContent = formatPrice(total);
  placeOrderButton.disabled = cart.length === 0;
}

function renderOrders() {
  document.querySelector("#order-count").textContent = String(orders.length);

  if (orders.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
      <span class="empty-icon" aria-hidden="true">☕</span>
      <strong>아직 접수된 주문이 없어요</strong>
      <p>새 주문이 들어오면 이곳에서 확인할 수 있어요.</p>
    `;
    ordersListElement.replaceChildren(emptyState);
    return;
  }

  ordersListElement.replaceChildren(...[...orders].reverse().map((order) => {
    const card = document.createElement("article");
    card.className = "order-card";
    const date = new Date(order.createdAt);
    const heading = document.createElement("div");
    heading.className = "order-card-heading";
    const orderIdentity = document.createElement("div");
    const orderTitle = document.createElement("strong");
    orderTitle.textContent = `주문 ${order.id}`;
    const orderTime = document.createElement("time");
    orderTime.dateTime = order.createdAt;
    orderTime.textContent = date.toLocaleString("ko-KR");
    orderIdentity.append(orderTitle, orderTime);
    const status = document.createElement("span");
    status.className = `order-status${order.status === "제조 완료" ? " is-complete" : ""}`;
    status.textContent = order.status;
    heading.append(orderIdentity, status);

    const itemList = document.createElement("ul");
    itemList.className = "order-item-list";
    order.items.forEach((item) => {
      const options = [
        item.shotAdded ? "샷 추가" : "",
        item.syrupAdded ? "시럽 추가" : ""
      ].filter(Boolean);
      const optionText = options.length > 0 ? ` (${options.join(", ")})` : "";
      const listItem = document.createElement("li");
      const lineTotal = item.unitPrice * item.quantity;
      listItem.textContent = `${item.name}${optionText} · ${formatPrice(item.unitPrice)} × ${item.quantity} = ${formatPrice(lineTotal)}`;
      itemList.append(listItem);
    });

    const footer = document.createElement("div");
    footer.className = "order-card-footer";
    const total = document.createElement("strong");
    total.textContent = formatPrice(order.total);
    footer.append(total);
    if (order.status === "제조 대기") {
      const completeButton = document.createElement("button");
      completeButton.className = "complete-order-button";
      completeButton.type = "button";
      completeButton.dataset.completeOrder = order.id;
      completeButton.textContent = "제조 완료";
      footer.append(completeButton);
    }

    card.append(heading, itemList, footer);
    return card;
  }));
}

function renderAll() {
  renderMenus();
  renderStock();
  renderCart();
  renderOrders();
}

function showMessage(text, isError = false) {
  message.hidden = false;
  message.textContent = text;
  message.classList.toggle("is-error", isError);
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

function addToCart(menuId, card) {
  const menu = menus.find((item) => item.id === menuId);
  if (!menu || menu.stock <= 0) {
    showMessage("품절된 메뉴는 장바구니에 담을 수 없습니다.", true);
    return;
  }

  const quantityInCart = getCartQuantity(menuId);
  if (quantityInCart >= menu.stock) {
    showMessage(`${menu.name} 재고가 부족합니다. 장바구니 수량을 확인해 주세요.`, true);
    return;
  }

  const shotAdded = card.querySelector(`[name="shot-${menuId}"]`).checked;
  const syrupAdded = card.querySelector(`[name="syrup-${menuId}"]`).checked;
  const existingItem = cart.find((item) =>
    item.menuId === menuId
    && item.shotAdded === shotAdded
    && item.syrupAdded === syrupAdded
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      menuId,
      name: menu.name,
      unitPrice: menu.price + (shotAdded ? SHOT_PRICE : 0),
      shotAdded,
      syrupAdded,
      quantity: 1
    });
  }

  renderAll();
  showMessage(`${menu.name}을(를) 장바구니에 담았습니다.`);
}

function placeOrder() {
  if (cart.length === 0) {
    showMessage("장바구니에 메뉴를 먼저 담아 주세요.", true);
    return;
  }

  for (const menuId of new Set(cart.map((item) => item.menuId))) {
    const menu = menus.find((entry) => entry.id === menuId);
    if (!menu || menu.stock < getCartQuantity(menuId)) {
      const menuName = menu ? menu.name : "선택한 메뉴";
      showMessage(`${menuName} 재고가 부족해 주문할 수 없습니다. 장바구니를 확인해 주세요.`, true);
      renderAll();
      return;
    }
  }

  const orderItems = cart.map((item) => ({ ...item }));
  const nextMenus = menus.map((menu) => ({
    ...menu,
    stock: menu.stock - getCartQuantity(menu.id)
  }));
  const total = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const order = {
    id: `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    items: orderItems,
    total,
    status: "제조 대기"
  };
  const nextOrders = [...orders, order];

  try {
    saveState(nextMenus, nextOrders);
  } catch (error) {
    showMessage(`주문 정보를 저장하지 못했습니다. 저장 공간을 확인해 주세요. (${error.message})`, true);
    return;
  }

  menus = nextMenus;
  orders = nextOrders;
  cart = [];
  renderAll();
  showMessage(`주문이 접수되었습니다. 주문 번호: ${order.id}`);
}

function completeOrder(orderId) {
  const nextOrders = orders.map((order) =>
    order.id === orderId ? { ...order, status: "제조 완료" } : order
  );

  try {
    saveState(menus, nextOrders);
  } catch (error) {
    showMessage(`주문 상태를 저장하지 못했습니다. (${error.message})`, true);
    return;
  }

  orders = nextOrders;
  renderOrders();
  showMessage(`주문 ${orderId}을(를) 제조 완료 처리했습니다.`);
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

menuGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-menu]");
  if (!button || button.disabled) return;

  const card = button.closest(".menu-card");
  addToCart(button.dataset.addMenu, card);
});

menuGrid.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") return;

  const isShot = input.name.startsWith("shot-");
  const menuId = input.name.slice(isShot ? 5 : 6);
  const selection = selectedOptions.get(menuId) || { shotAdded: false, syrupAdded: false };
  if (isShot) {
    selection.shotAdded = input.checked;
  } else {
    selection.syrupAdded = input.checked;
  }
  selectedOptions.set(menuId, selection);
});

cartItemsElement.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-item]");
  if (!button) return;

  const item = cart[Number(button.dataset.removeItem)];
  if (!item) return;

  cart.splice(Number(button.dataset.removeItem), 1);
  renderAll();
  showMessage(`${item.name}을(를) 장바구니에서 삭제했습니다.`);
});

ordersListElement.addEventListener("click", (event) => {
  const button = event.target.closest("[data-complete-order]");
  if (button) completeOrder(button.dataset.completeOrder);
});

placeOrderButton.addEventListener("click", placeOrder);

window.addEventListener("storage", (event) => {
  if (event.key !== STATE_STORAGE_KEY || event.newValue === null) return;

  try {
    const state = loadState();
    menus = state.menus;
    orders = state.orders;
    renderAll();
  } catch (error) {
    showMessage(`다른 창에서 저장된 데이터를 불러오지 못했습니다. (${error.message})`, true);
  }
});

try {
  const state = loadState();
  menus = state.menus;
  orders = state.orders;
  renderAll();
} catch (error) {
  message.hidden = false;
  message.classList.add("is-error");
  message.textContent = `화면을 불러오지 못했습니다. 브라우저 저장 공간을 확인해 주세요. (${error.message})`;
  viewButtons.forEach((button) => {
    button.disabled = true;
  });
  placeOrderButton.disabled = true;
}
