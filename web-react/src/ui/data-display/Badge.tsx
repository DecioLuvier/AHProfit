import { QualityBadge } from "./primitives";

export function Badge({ quality, qualityTier }: { quality: string; qualityTier?: number | string | null }) {
	return <QualityBadge quality={quality} qualityTier={qualityTier} />;
}
