"use client";

import {
  IconChevronLeft,
  IconChevronRight,
  IconUsersGroup,
} from "@tabler/icons-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isWeekend,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import type { LeaveRequest } from "@/domain/vacations";
import { getActiveLeaveRequestsForDate } from "@/domain/vacations";

type LeaveCalendarProps = {
  requests: LeaveRequest[];
};

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function LeaveCalendar({ requests }: LeaveCalendarProps) {
  const visibleRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          request.status === "submitted" || request.status === "approved",
      ),
    [requests],
  );
  const firstRequestDate = visibleRequests
    .map((request) => request.startDate)
    .sort()[0];
  const [month, setMonth] = useState(() =>
    startOfMonth(firstRequestDate ? parseISO(firstRequestDate) : new Date()),
  );
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  );

  return (
    <section className="card leave-calendar" aria-labelledby="calendar-title">
      <div className="calendar-header">
        <div>
          <p className="eyebrow">Cobertura</p>
          <h2 id="calendar-title">Calendario operativo</h2>
        </div>
        <div className="calendar-navigation" aria-label="Cambiar mes">
          <button
            type="button"
            className="icon-button"
            aria-label="Mes anterior"
            onClick={() => setMonth((current) => subMonths(current, 1))}
          >
            <IconChevronLeft aria-hidden="true" size={19} />
          </button>
          <strong aria-live="polite">
            {format(month, "MMMM yyyy", { locale: es })}
          </strong>
          <button
            type="button"
            className="icon-button"
            aria-label="Mes siguiente"
            onClick={() => setMonth((current) => addMonths(current, 1))}
          >
            <IconChevronRight aria-hidden="true" size={19} />
          </button>
        </div>
      </div>

      <div className="calendar-weekdays" aria-hidden="true">
        {weekDays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day) => {
          const dayRequests = getActiveLeaveRequestsForDate(
            visibleRequests,
            day,
          );
          const overlap = dayRequests.length > 1;
          const hasPending = dayRequests.some(
            (request) => request.status === "submitted",
          );
          const hasApproved = dayRequests.some(
            (request) => request.status === "approved",
          );
          const label = `${format(day, "d MMMM yyyy", { locale: es })}. ${
            dayRequests.length === 0
              ? "Sin ausencias"
              : `${dayRequests.length} ${
                  dayRequests.length === 1 ? "ausencia" : "ausencias"
                }: ${dayRequests.map((request) => request.employeeName).join(", ")}`
          }`;

          return (
            <div
              className={`calendar-day${
                isSameMonth(day, month) ? "" : " outside-month"
              }${isWeekend(day) ? " weekend" : ""}${
                hasPending ? " has-pending" : ""
              }${hasApproved ? " has-approved" : ""}${
                overlap ? " overlap" : ""
              }`}
              key={day.toISOString()}
              aria-label={label}
            >
              <span>{format(day, "d")}</span>
              {dayRequests.length > 0 ? (
                <span className="calendar-occupancy" aria-hidden="true">
                  {overlap ? <IconUsersGroup size={14} /> : null}
                  {dayRequests.length}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="calendar-legend" aria-label="Leyenda del calendario">
        <span><i className="legend-dot pending" /> Pendiente</span>
        <span><i className="legend-dot approved" /> Aprobada</span>
        <span><i className="legend-dot overlap" /> Solapamiento</span>
      </div>
    </section>
  );
}
