"use client";

/**
 * Keep the actual LoadLink truck visible from the very first paint.
 * The previous animation drove it fully offscreen and left a blank cream page.
 */
export default function LoadLinkLoading() {
  return (
    <div data-loadlink-page-loading="true" role="status" aria-live="polite"
      aria-label="Loading LoadLink"
      className="pointer-events-none fixed inset-0 z-[9999] grid place-items-center overflow-hidden">
      <div className="loadlink-loading-scene" aria-hidden="true">
        <div className="loadlink-loading-truck">
          <div className="loadlink-loading-trailer"><span>LOADLINK</span></div>
          <div className="loadlink-loading-cab"><span className="loadlink-loading-window" /></div>
          <span className="loadlink-loading-wheel wheel-back" />
          <span className="loadlink-loading-wheel wheel-front" />
        </div>
        <div className="loadlink-loading-road" />
      </div>
      <span className="loadlink-loading-caption">Loading LoadLink</span>
      <style jsx>{`
        .loadlink-loading-scene { position: relative; width: 208px; height: 95px; }
        .loadlink-loading-truck {
          position: absolute; bottom: 17px; left: 14px;
          width: 180px; height: 61px;
          animation: loadlink-loader-suspension 1.3s ease-in-out infinite;
        }
        .loadlink-loading-trailer {
          position: absolute; left: 0; bottom: 10px; width: 121px; height: 48px;
          border: 2px solid #f6b800; border-radius: 3px;
          background: #151515; display: flex; align-items: center; justify-content: center;
        }
        .loadlink-loading-trailer span {
          color: #f6b800; font-size: 12px; font-weight: 900;
          font-style: italic; letter-spacing: .055em;
        }
        .loadlink-loading-cab {
          position: absolute; right: 0; bottom: 10px; width: 57px; height: 43px;
          background: #f6b800; border: 2px solid #151515; border-radius: 8px 7px 3px 0;
          clip-path: polygon(0 0, 72% 0, 100% 35%, 100% 100%, 0 100%);
        }
        .loadlink-loading-window {
          position: absolute; right: 6px; top: 7px; width: 19px; height: 15px;
          background: #151515; border-radius: 2px; transform: skew(8deg);
        }
        .loadlink-loading-wheel {
          position: absolute; bottom: 0; width: 21px; height: 21px;
          border: 5px solid #151515; border-radius: 50%; background: #f6b800;
          animation: loadlink-loader-wheel .6s linear infinite;
        }
        .wheel-back { left: 19px; } .wheel-front { right: 13px; }
        .loadlink-loading-road {
          position: absolute; bottom: 11px; left: 3px; width: 202px; height: 2px;
          background: linear-gradient(90deg, transparent, #f6b800 25%, #f6b800 75%, transparent);
          opacity: .72;
        }
        .loadlink-loading-caption {
          position: absolute; top: calc(50% + 61px); left: 0; right: 0;
          text-align: center; font-size: 12px; font-weight: 600;
          letter-spacing: .02em; opacity: .65;
        }
        @keyframes loadlink-loader-suspension {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes loadlink-loader-wheel { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .loadlink-loading-truck, .loadlink-loading-wheel { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
