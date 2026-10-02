import s from './budget.module.css';

/** Loading state (reference: "Result cards skeleton."): the inputs card on the left, result cards on the right. */
export function BudgetSkeleton() {
  return (
    <div className={`skl ${s.cols}`} role="status" aria-busy="true" aria-label="Loading the budget">
      <div className="sk" style={{ height: 380 }} aria-hidden="true" />
      <div className={s.results} aria-hidden="true">
        <div className="sk" style={{ height: 96 }} />
        <div className="sk" style={{ height: 96 }} />
        <div className="sk" style={{ height: 190 }} />
      </div>
    </div>
  );
}
