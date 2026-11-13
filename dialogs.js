export const elements = {
  bankruptModal: document.getElementById("bankrupt-modal"),
  bankruptKicker: document.getElementById("bankrupt-kicker"),
  bankruptTitle: document.getElementById("bankrupt-title"),
  bankruptCopy: document.getElementById("bankrupt-copy"),
  bankruptError: document.getElementById("bankrupt-error"),
  bankruptActions: document.getElementById("bankrupt-actions"),
  acceptDefeatButton: document.getElementById("accept-defeat-button"),
  bankLoanButton: document.getElementById("bank-loan-button"),
  loanModal: document.getElementById("loan-modal"),
  gameoverModal: document.getElementById("gameover-modal"),
  gameoverEyebrow: document.getElementById("gameover-eyebrow"),
  gameoverTitle: document.getElementById("gameover-title"),
  gameoverCopy: document.getElementById("gameover-copy"),
  gameoverError: document.getElementById("gameover-error"),
  finalBalance: document.getElementById("final-balance"),
  newGameButton: document.getElementById("new-game-button")
};

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}

function showDialog(dialog) {
  for (const other of [elements.bankruptModal, elements.loanModal, elements.gameoverModal]) {
    if (other !== dialog) closeDialog(other);
  }
  if (!dialog.open) dialog.showModal();
}

function focusFirst(container) {
  const focusable = container.querySelector("button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex='-1'])");
  if (focusable) focusable.focus();
}

export function resetBankruptcy() {
  elements.bankruptKicker.textContent = "BALANCE: 0 GOLD";
  elements.bankruptTitle.textContent = "No gold left";
  elements.bankruptError.textContent = "";
  elements.acceptDefeatButton.textContent = "Accept defeat";
  elements.bankLoanButton.hidden = false;
  elements.bankruptActions.classList.remove("single-action");
}

export function showBankruptcy({ allLoansUsed, overdueText, hasActiveLoans }) {
  resetBankruptcy();
  if (allLoansUsed) {
    elements.bankruptCopy.textContent = "You've used all three loans. Accept defeat to finish this game.";
    elements.bankLoanButton.hidden = true;
    elements.bankruptActions.classList.add("single-action");
  } else if (overdueText) {
    elements.bankruptCopy.textContent = `Your balance is 0 gold. You can take another available loan, but ${overdueText} gold in overdue repayments must be settled immediately.`;
  } else if (hasActiveLoans) {
    elements.bankruptCopy.textContent = "Your balance is 0 gold. You can borrow again, which extends your existing repayment deadlines.";
  } else {
    elements.bankruptCopy.textContent = "Your balance is 0 gold. Take an available loan to continue, or end this game.";
  }
  showDialog(elements.bankruptModal);
  focusFirst(elements.bankruptModal);
}

export function showExhaustedLoans() {
  // Reuse the current dialog: ending a game with no loans left should not open a second modal.
  elements.bankruptKicker.textContent = "GAME OVER";
  elements.bankruptTitle.textContent = "All loans used";
  elements.bankruptCopy.textContent = "You used all three loans and lost the remaining balance.";
  elements.acceptDefeatButton.textContent = "Start new game";
  elements.bankLoanButton.hidden = true;
  elements.bankruptActions.classList.add("single-action");
  showDialog(elements.bankruptModal);
  elements.acceptDefeatButton.focus();
}

export function showGameOver(eyebrow, copy, title, balanceText) {
  elements.gameoverEyebrow.textContent = eyebrow;
  elements.gameoverTitle.textContent = title;
  elements.gameoverCopy.textContent = copy;
  elements.gameoverError.textContent = "";
  elements.finalBalance.textContent = `${balanceText} GOLD`;
  showDialog(elements.gameoverModal);
  elements.newGameButton.focus();
}

export function showLoan() {
  elements.bankruptError.textContent = "";
  showDialog(elements.loanModal);
  focusFirst(elements.loanModal);
}

export function closeLoan(waitingForLoan) {
  if (waitingForLoan) {
    showDialog(elements.bankruptModal);
    elements.bankLoanButton.focus();
  } else {
    closeDialog(elements.loanModal);
  }
}

export function closeAll() {
  for (const dialog of [elements.bankruptModal, elements.loanModal, elements.gameoverModal]) closeDialog(dialog);
}

export function showError(message) {
  elements.bankruptError.textContent = message;
  elements.gameoverError.textContent = message;
}

document.addEventListener("keydown", event => {
  // These dialogs need a game decision. Chrome lets a page cancel a dialog's "cancel" event only
  // once per user activation, so blocking it there would let a second Escape through.
  if (event.key === "Escape" && document.querySelector(".game-dialog:modal")) event.preventDefault();
  // A modal can take focus while the hold key is still down, so only a fresh press counts.
  if (event.repeat && (event.key === "Enter" || event.key === " ") && event.target.closest(".game-dialog")) {
    event.preventDefault();
  }
});
