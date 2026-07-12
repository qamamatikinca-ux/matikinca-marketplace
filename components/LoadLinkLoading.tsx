"use client";

export default function LoadLinkLoading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black/70 backdrop-blur-md">
      <div className="relative h-36 w-full">
        <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-yellow-400/20" />

        <div className="absolute left-0 top-1/2 h-16 w-[140vw] -translate-y-1/2">
          <div className="loadlink-truck">
            <div className="truck-body">
              <div className="truck-cab" />
              <div className="truck-box">
                <span>LOADLINK</span>
              </div>
              <div className="wheel wheel-one" />
              <div className="wheel wheel-two" />
            </div>

            <div className="track-mark track-one" />
            <div className="track-mark track-two" />
          </div>
        </div>
      </div>

      <style jsx>{`
        .loadlink-truck {
          position: absolute;
          top: 50%;
          left: -220px;
          width: 220px;
          height: 84px;
          transform: translateY(-50%);
          animation: truck-drive 1.65s linear infinite;
        }

        .truck-body {
          position: absolute;
          left: 44px;
          top: 15px;
          width: 148px;
          height: 54px;
        }

        .truck-box {
          position: absolute;
          right: 0;
          top: 0;
          height: 45px;
          width: 112px;
          border: 2px solid #f6b800;
          background: #111;
          box-shadow: 0 0 18px rgba(246, 184, 0, 0.28);
        }

        .truck-box span {
          position: absolute;
          left: 10px;
          top: 14px;
          color: #f6b800;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
        }

        .truck-cab {
          position: absolute;
          left: 0;
          top: 12px;
          width: 42px;
          height: 33px;
          background: #f6b800;
          clip-path: polygon(0 100%, 0 35%, 18% 0, 100% 0, 100% 100%);
        }

        .wheel {
          position: absolute;
          bottom: 0;
          height: 20px;
          width: 20px;
          border-radius: 999px;
          border: 4px solid #f6b800;
          background: #050505;
          animation: wheel-spin 0.35s linear infinite;
        }

        .wheel-one {
          left: 26px;
        }

        .wheel-two {
          right: 16px;
        }

        .track-mark {
          position: absolute;
          right: 200px;
          width: 170px;
          height: 8px;
          opacity: 0.8;
          background:
            repeating-linear-gradient(
              90deg,
              transparent 0 9px,
              #f6b800 9px 15px,
              transparent 15px 24px
            );
          transform: skewX(-22deg);
          animation: track-fade 1.65s linear infinite;
        }

        .track-one {
          bottom: 5px;
        }

        .track-two {
          bottom: -7px;
        }

        @keyframes truck-drive {
          from {
            transform: translate(-260px, -50%);
          }
          to {
            transform: translate(120vw, -50%);
          }
        }

        @keyframes wheel-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes track-fade {
          0% {
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          80% {
            opacity: 0.55;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
