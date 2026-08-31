import { Link } from "react-router-dom";
import { ItemIcon } from "@/ui/data-display/ItemIcon";

export function ReagentRow({
	id,
	name,
	icon,
	quality,
	qualityTier,
	quantity,
	value,
}: {
	id: number;
	name: string;
	icon: string;
	quality?: string | null;
	qualityTier?: number | null;
	quantity: number;
	value?: string;
}) {
	return (
		<Link to={`/items/${id}`} className="reagent-row">
			<ItemIcon icon={icon} name={name} quality={quality} qualityTier={qualityTier} size={24} />
			<span className="reagent-row-name">
				{name}
				{quantity > 1 ? <span className="reagent-row-qty">×{quantity}</span> : null}
			</span>
			{value ? <span className="reagent-row-value">{value}</span> : null}
		</Link>
	);
}
