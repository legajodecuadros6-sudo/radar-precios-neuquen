import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useBasket } from '../context/BasketContext';

interface CategoryFiltersProps {
  categories: string[];
  counts: Record<string, number>;
  sortBy: string;
  setSortBy: (sort: string) => void;
}

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  categories,
  counts,
  sortBy,
  setSortBy
}) => {
  const { selectedCategory, setSelectedCategory } = useBasket();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      
      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
        {categories.map(category => {
          const isSelected = selectedCategory === category;
          const count = counts[category] || 0;

          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
              }`}
            >
              <span>{category}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sorting Dropdown */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <ArrowUpDown className="w-4 h-4 text-slate-400" />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-white border border-slate-200/90 text-xs font-semibold text-slate-700 py-2 px-3 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none cursor-pointer"
        >
          <option value="max_savings">Mayor Ahorro Potencial</option>
          <option value="lowest_price">Precio Más Bajo</option>
          <option value="name_asc">Nombre (A - Z)</option>
        </select>
      </div>

    </div>
  );
};
