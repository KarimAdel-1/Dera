import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Calendar = ({ onDateSelect, selectedDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const days = [];
  const current = new Date(startDate);
  
  for (let i = 0; i < 42; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const isToday = (date) => {
    return date.toDateString() === today.toDateString();
  };
  
  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };
  
  const isCurrentMonth = (date) => {
    return date.getMonth() === month;
  };
  
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-lg p-4 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="p-1 hover:bg-[var(--color-bg-hover)] rounded-md transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {monthNames[month]} {year}
        </h2>
        
        <button
          onClick={goToNextMonth}
          className="p-1 hover:bg-[var(--color-bg-hover)] rounded-md transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
      </div>
      
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-medium text-[var(--color-text-muted)] py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => (
          <button
            key={index}
            onClick={() => onDateSelect && onDateSelect(date)}
            className={`
              w-8 h-8 text-sm rounded-md transition-colors
              ${isCurrentMonth(date) 
                ? 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]' 
                : 'text-[var(--color-text-muted)] opacity-50'
              }
              ${isToday(date) ? 'bg-[var(--color-primary)] text-white' : ''}
              ${isSelected(date) ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : ''}
            `}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Calendar;