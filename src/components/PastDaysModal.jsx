import { useState } from 'react'
import Modal from './Modal'

// Minimum date that can be selected (December 28th, 2025)
const MIN_DATE = new Date(2026, 0, 1) // Month is 0-indexed, so 11 = December

export default function PastDaysModal({ isOpen, onClose, onDateSelect, completedDays = [] }) {
  const isAdmin = import.meta.env.VITE_ADMIN_MODE === 'true'
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const minDate = new Date(MIN_DATE)
  minDate.setHours(0, 0, 0, 0)

  // Helper to format date as YYYY-MM-DD
  const formatDate = (date) => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Check if a date is completed
  const isCompleted = (date) => {
    const dateStr = formatDate(date)
    return completedDays.includes(dateStr)
  }

  // Check if date is disabled (before MIN_DATE or in the future)
  // In admin mode, allow future dates
  const isDisabled = (date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    if (isAdmin) {
      return d < minDate
    }
    return d < minDate || d > today
  }

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  // Navigate to previous month
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  // Handle date click
  const handleDateClick = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    if (isDisabled(date)) return

    const dateStr = formatDate(date)
    onDateSelect(dateStr)
    onClose()
  }

  // Render calendar
  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth)
    const days = []

    // Add empty cells for days before the first day of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day-empty"></div>)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const disabled = isDisabled(date)
      const completed = isCompleted(date)

      let className = 'calendar-day'
      if (disabled) {
        className += ' disabled'
      } else if (completed) {
        className += ' completed'
      } else if (date > today && isAdmin) {
        className += ' future'
      } else if (date < today) {
        className += ' past'
      }

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          disabled={disabled}
          className={className}
        >
          {day}
        </button>
      )
    }

    return days
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isAdmin ? "Past & Future Days (Admin)" : "Past Days"}>
      <div className="calendar-container">
        {/* Navigation */}
        <div className="calendar-header">
          <button onClick={previousMonth} className="nav-button">
            ‹
          </button>
          <div className="month-year">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <button onClick={nextMonth} className="nav-button">
            ›
          </button>
        </div>

        {/* Weekday labels */}
        <div className="calendar-weekdays">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar grid */}
        <div className="calendar-grid">
          {renderCalendar()}
        </div>
      </div>

      <style jsx>{`
        .calendar-container {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .nav-button {
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          font-weight: bold;
          cursor: pointer;
          padding: 0.5rem 1rem;
          transition: background-color 0.2s;
          border-radius: 0.375rem;
        }

        .nav-button:hover {
          background: #292524;
        }

        .month-year {
          color: white;
          font-size: 1rem;
          font-weight: 600;
        }

        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .calendar-weekdays > div {
          text-align: center;
          color: #a8a29e;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          padding: 0.5rem;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.25rem;
        }

        .calendar-day-empty {
          aspect-ratio: 1;
        }

        .calendar-day {
          aspect-ratio: 1;
          border: none;
          background: none;
          color: white;
          font-size: 0.875rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .calendar-day:hover:not(.disabled) {
          background: #292524;
        }

        .calendar-day.past {
          color: #a8a29e;
        }

        .calendar-day.future {
          color: #fbbf24;
          border: 1px solid #fbbf24;
        }

        .calendar-day.future:hover {
          background: rgba(251, 191, 36, 0.1);
        }

        .calendar-day.completed {
          background: #16a34a;
          color: white;
          font-weight: 600;
        }

        .calendar-day.completed:hover {
          background: #15803d;
        }

        .calendar-day.disabled {
          color: #57534e;
          cursor: not-allowed;
        }

        .calendar-day.disabled:hover {
          background: none;
        }
      `}</style>
    </Modal>
  )
}
