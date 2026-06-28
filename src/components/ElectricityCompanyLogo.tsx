"use client";

import Image from "next/image";
import {
  ELECTRICITY_LOGO_FRAME_CLASS,
  ELECTRICITY_LOGO_HEIGHT,
  ELECTRICITY_LOGO_WIDTH,
} from "@/lib/utility-rates";

type ElectricityCompanyLogoProps = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
};

export function ElectricityCompanyLogo({
  src,
  alt,
  className = "",
  imgClassName = "utility-logo-img",
}: ElectricityCompanyLogoProps) {
  return (
    <div
      className={`${ELECTRICITY_LOGO_FRAME_CLASS} theme-electricity ${className}`.trim()}
      style={{ width: ELECTRICITY_LOGO_WIDTH, height: ELECTRICITY_LOGO_HEIGHT }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${ELECTRICITY_LOGO_WIDTH}px`}
        quality={95}
        className={imgClassName}
      />
      <style jsx>{`
        div {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          padding: 8px;
          border-radius: 12px;
          background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%);
          border: 1px solid rgba(234, 179, 8, 0.22);
          box-shadow: 0 2px 8px rgba(234, 179, 8, 0.1);
          overflow: hidden;
          line-height: 0;
          box-sizing: border-box;
        }
        div :global(img) {
          object-fit: contain !important;
          object-position: center !important;
          padding: 1px;
        }
        :global(html.dark) div {
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          border-color: rgba(234, 179, 8, 0.3);
        }
      `}</style>
    </div>
  );
}
