import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, TrendingUp, Star, CheckCircle, Lock, Users } from 'lucide-react';
import type { useScore } from '../hooks/useScore';
import type { Purchase } from '../types';
import { LEVEL_COLORS, LEVEL_ORDER, LEVEL_THRESHOLDS } from '../constants/kueski';
import { evaluateAchievements } from '../utils/achievements';

interface ScoreCoachProps {
  score: ReturnType<typeof useScore>;
  purchases: Purchase[];
}

export function ScoreCoach({ score, purchases }: ScoreCoachProps) {
  const { points, level, achievements, nextLevelThreshold, completeAchievement } = score;

  // Auto-completar logros que ya se cumplen por actividad
  useEffect(() => {
    const progress = evaluateAchievements(purchases);
    for (const p of progress) {
      if (p.met) {
        const ach = achievements.find((a) => a.id === p.id);
        if (ach && !ach.completed) completeAchievement(p.id);
      }
    }
  }, [purchases, achievements, completeAchievement]);

  const progress = evaluateAchievements(purchases);

  const currentLevelIdx = LEVEL_ORDER.indexOf(level);
  const prevThreshold   = LEVEL_THRESHOLDS[level];
  const nextThreshold   = nextLevelThreshold();
  const nextLevel       = LEVEL_ORDER[currentLevelIdx + 1];

  const progressInLevel   = points - prevThreshold;
  const rangeSize          = nextThreshold - prevThreshold;
  const progressPercentage = nextLevel
    ? Math.min((progressInLevel / rangeSize) * 100, 100)
    : 100;

  const levelGradient = LEVEL_COLORS[level];

  const tips = [
    'Paga siempre a tiempo para subir de nivel más rápido',
    'Usa Kueski Pay regularmente para ganar puntos extra',
  ];

  return (
    <div className="space-y-4">
      {/* Nivel actual */}
      <div className={`${levelGradient} text-white rounded-xl p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 rounded-lg p-2">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/80">Tu nivel actual</p>
              <h3 className="font-bold text-lg leading-tight">{level}</h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{points}</p>
            <p className="text-xs text-white/80">puntos</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/80">
            <span>{nextLevel ? `Progreso a ${nextLevel}` : 'Nivel máximo alcanzado'}</span>
            <span>{points}/{nextThreshold}</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              key={points}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-white/80"
            />
          </div>
          {nextLevel && (
            <p className="text-xs text-white/80 text-center mt-1">
              ¡Faltan {nextThreshold - points} puntos para {nextLevel}!
            </p>
          )}
        </div>
      </div>

      {/* Niveles disponibles */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-blue-600" />
          Niveles disponibles
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {LEVEL_ORDER.map((lvl, index) => {
            const isUnlocked = LEVEL_ORDER.indexOf(level) >= index;
            const gradient   = LEVEL_COLORS[lvl];
            return (
              <div
                key={lvl}
                className={`relative rounded-lg p-3 border-2 ${
                  isUnlocked
                    ? `${gradient} border-transparent`
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                {!isUnlocked && (
                  <Lock className="absolute top-2 right-2 w-3 h-3 text-gray-400" />
                )}
                <p className={`text-xs font-semibold ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                  {lvl}
                </p>
                <p className={`text-[10px] ${isUnlocked ? 'text-white/80' : 'text-gray-400'}`}>
                  {LEVEL_THRESHOLDS[lvl].toLocaleString()} pts
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          Logros
        </h4>
        <div className="space-y-2">
          {achievements.map((achievement) => {
            const prog = progress.find((p) => p.id === achievement.id);
            return (
              <div
                key={achievement.id}
                className={`w-full p-2 rounded-lg border ${
                  achievement.completed
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-full p-1 ${achievement.completed ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                      {achievement.completed
                        ? <CheckCircle className="w-3 h-3 text-white" />
                        : <Lock className="w-3 h-3 text-gray-500" />
                      }
                    </div>
                    <span className={`text-xs ${achievement.completed ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {achievement.title}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${achievement.completed ? 'text-emerald-600' : 'text-gray-400'}`}>
                    +{achievement.points} pts
                  </span>
                </div>
                {prog && !achievement.completed && (
                  <div className="mt-1.5 space-y-0.5">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((prog.current / prog.target) * 100, 100)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full bg-[#173CEC] rounded-full"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 text-right">{prog.current}/{prog.target}</p>
                  </div>
                )}
                {achievement.id === 'referral' && !achievement.completed && (
                  <button
                    onClick={() => completeAchievement('referral')}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[#173CEC] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg py-1.5 transition-colors"
                  >
                    <Users className="w-3 h-3" />
                    Invitar a un amigo
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 text-sm mb-2">Consejos para subir de nivel</h4>
        <ul className="space-y-1.5">
          {tips.map((tip) => (
            <li key={tip} className="text-xs text-blue-800 flex items-start gap-2">
              <span className="text-blue-500 mt-0.5 shrink-0">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
