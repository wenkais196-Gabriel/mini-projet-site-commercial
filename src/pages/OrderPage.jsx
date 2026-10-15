/* =============================================================================
   OrderPage — order form.

   Three responsibilities, in this order:
     1. SELECTION: which products, in which quantities. The "comply with the
        available quantity" constraint is guaranteed at the source by
        QuantitySelector (bounded to [0, stock]), never by an error message afterwards;
     2. ASSEMBLY: the OrderBuilder builds the order object and refuses an impossible
        line (Builder pattern);
     3. VALIDATION: the store validates again before saving — it trusts nobody —
        then decrements the stock (Command pattern, undoable).

   The messages are NOT derived from nested conditions: they are driven by the state
   machine of the form (State pattern, `orderStatus.js`). Only the "Invalide" state
   displays the errors, only "Enregistrée" displays the confirmation.

   This component never modifies the products: it ASKS the store to save the order.
   The stock decrement is a side effect of the store.
   ========================================================================== */

import { useMemo, useState } from "react";
import { OrderRow } from "../components/order/OrderRow.jsx";
import { useData } from "../store/DataContext.jsx";
import { OrderBuilder } from "../store/orderBuilder.js";
import { formatPrice } from "../store/selectors.js";
import {
  STATUSES,
  showsConfirmation,
  showsErrors,
  statusAfterEdit,
  statusAfterNewOrder,
  statusAfterSubmit,
} from "../store/orderStatus.js";

const EMPTY_CUSTOMER = { lastName: "", firstName: "", email: "" };

const formIsEmpty = (customer, quantities) =>
  customer.lastName === "" &&
  customer.firstName === "" &&
  customer.email === "" &&
  Object.values(quantities).every((quantity) => Number(quantity) === 0);

export function OrderPage() {
  // The store action validates one last time and then saves: it is named after
  // what it actually does in this page.
  const { products, saveOrder } = useData();

  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  /* The quantities live HERE and not in OrderRow: the total and the building of the
     order need the whole order. One state per row would make that computation
     impossible without reporting every value up. */
  const [quantities, setQuantities] = useState({});
  const [report, setReport] = useState(null);
  const [savedOrder, setSavedOrder] = useState(null);
  const [status, setStatus] = useState(STATUSES.DRAFT);

  /* The order being built is recomputed on every keystroke: it is DERIVED data, so
     it has no useState. The Builder is the only way to assemble an order here. */
  const builtOrder = useMemo(() => {
    const builder = new OrderBuilder(products).setCustomer(customer);
    for (const [productId, quantity] of Object.entries(quantities)) {
      // Lines at 0 are not added: they are not orders, only sliders back to zero.
      if (Number(quantity) > 0) builder.addLine(productId, Number(quantity));
    }
    return builder.build();
  }, [products, customer, quantities]);

  const lines = builtOrder.lines;

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const product = products.find((candidate) => candidate.id === line.productId);
        return product ? sum + product.price * line.quantity : sum;
      }, 0),
    [lines, products],
  );

  const recap = useMemo(
    () =>
      (savedOrder?.lines ?? []).map((line) => ({
        ...line,
        product: products.find((candidate) => candidate.id === line.productId),
      })),
    [savedOrder, products],
  );

  const errors = report?.errors ?? {};
  const errorsByProduct = report?.errorsByProduct ?? {};

  /** Any change brings the form back to "being edited", therefore without messages. */
  function afterChange(nextCustomer, nextQuantities) {
    setReport(null);
    setSavedOrder(null);
    setStatus((previous) =>
      statusAfterEdit(previous, {
        formIsEmpty: formIsEmpty(nextCustomer, nextQuantities),
      }),
    );
  }

  function changeCustomer(field, value) {
    const next = { ...customer, [field]: value };
    setCustomer(next);
    afterChange(next, quantities);
  }

  function changeQuantity(productId, quantity) {
    const next = { ...quantities, [productId]: quantity };
    setQuantities(next);
    afterChange(customer, next);
  }

  function submit(event) {
    event.preventDefault();

    // 1. The Builder judges the object it assembled. If it is incomplete, the state
    //    machine moves to "Invalide": that state is what makes the messages appear.
    if (!builtOrder.valid) {
      setReport(builtOrder);
      setStatus((previous) => statusAfterSubmit(previous, { valid: false }));
      return;
    }

    // 2. The store validates again (last line of defence) and saves the order.
    const result = saveOrder(builtOrder.form);
    if (!result.valid) {
      setReport(result);
      setStatus((previous) => statusAfterSubmit(previous, { valid: false }));
      return;
    }

    // 3. Nominal path: the stock changed, the other two pages will follow.
    setReport(null);
    setSavedOrder(result.order);
    setStatus((previous) => statusAfterSubmit(previous, { valid: true }));
    setCustomer(EMPTY_CUSTOMER);
    setQuantities({});
  }

  function startNewOrder() {
    setSavedOrder(null);
    setStatus((previous) => statusAfterNewOrder(previous));
  }

  return (
    <>
      <header className="page-header d-flex justify-content-between align-items-start">
        <div>
          <h1>Commande</h1>
          <p className="subtitle mb-0">
            Les quantités proposées sont limitées au stock disponible.
          </p>
        </div>
        {/* The state machine is visible: it decides what gets displayed */}
        <span className="badge text-bg-light border" data-testid="order-status">
          {status}
        </span>
      </header>

      {showsConfirmation(status) && savedOrder ? (
        <div className="alert alert-success">
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <strong>Commande {savedOrder.id} enregistrée.</strong> Le stock des
              produits concernés a été mis à jour, et le tableau de bord en tient
              compte.
              <ul className="mb-0 mt-2">
                {recap.map((line) => (
                  <li key={line.productId}>
                    {line.quantity} × {line.product?.name ?? line.productId} —{" "}
                    {formatPrice((line.product?.price ?? 0) * line.quantity)}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-success text-nowrap"
              onClick={startNewOrder}
            >
              Nouvelle commande
            </button>
          </div>
        </div>
      ) : null}

      {showsErrors(status) && report ? (
        <div className="alert alert-danger">
          <strong>La commande n'a pas été enregistrée.</strong>
          <ul className="mb-0 mt-2">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
            {Object.entries(errorsByProduct).map(([productId, message]) => (
              <li key={productId}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form onSubmit={submit} noValidate>
        {/* --- 1. The customer ------------------------------------------- */}
        <div className="card mb-3">
          <div className="card-header bg-white fw-semibold">Client</div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="customer-last-name">
                  Nom
                </label>
                <input
                  id="customer-last-name"
                  type="text"
                  className={`form-control ${errors.lastName ? "is-invalid" : ""}`}
                  value={customer.lastName}
                  onChange={(event) => changeCustomer("lastName", event.target.value)}
                />
                {errors.lastName ? (
                  <div className="invalid-feedback">{errors.lastName}</div>
                ) : null}
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="customer-first-name">
                  Prénom
                </label>
                <input
                  id="customer-first-name"
                  type="text"
                  className={`form-control ${errors.firstName ? "is-invalid" : ""}`}
                  value={customer.firstName}
                  onChange={(event) => changeCustomer("firstName", event.target.value)}
                />
                {errors.firstName ? (
                  <div className="invalid-feedback">{errors.firstName}</div>
                ) : null}
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="customer-email">
                  Adresse mail
                </label>
                <input
                  id="customer-email"
                  type="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  value={customer.email}
                  onChange={(event) => changeCustomer("email", event.target.value)}
                />
                {errors.email ? (
                  <div className="invalid-feedback">{errors.email}</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* --- 2. The products ------------------------------------------ */}
        <div className="card mb-3">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Produits</span>
            <span className="small text-muted">
              {lines.length} ligne{lines.length > 1 ? "s" : ""} · total {formatPrice(total)}
            </span>
          </div>

          {errors.lines ? (
            <div className="alert alert-warning m-3 mb-0">{errors.lines}</div>
          ) : null}

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Produit</th>
                  <th scope="col" className="text-end">Prix</th>
                  <th scope="col" className="text-end">Stock</th>
                  <th scope="col">Quantité</th>
                  <th scope="col" className="text-end">Sous-total</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <OrderRow
                    key={product.id}
                    product={product}
                    quantity={quantities[product.id] ?? 0}
                    onQuantityChange={changeQuantity}
                    error={errorsByProduct[product.id] ?? null}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="d-flex justify-content-end align-items-center gap-3">
          <span className="fw-semibold">Total : {formatPrice(total)}</span>
          <button type="submit" className="btn btn-primary">
            Valider la commande
          </button>
        </div>
      </form>
    </>
  );
}
