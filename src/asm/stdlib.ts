// Standard control-flow macro prelude (the corrected assembler.txt section 6).
//
// Hardware predicates EXECUTE the following instruction when the condition is
// true, so each `if` emits the COMPLEMENT predicate guarding a jump to the
// block's exit. One label family (if_false_N) serves both the plain and the
// if/else shapes, so every generated label is defined exactly once:
//   ife a b BODY end          -> N a b / J if_false_1 / BODY / if_false_1:
//   ife a b T else F end      -> N a b / J if_false_1 / T / J if_false_2 /
//                                if_false_1: / F / if_false_2:

export const STDLIB = `
$ife/2: N $1 $2 J if_false_$$ push_id end
$ifn/2: E $1 $2 J if_false_$$ push_id end
$ifl/2: G $1 $2 J if_false_$$ push_id end
$ifg/2: G $2 $1 J if_false_$$ push_id end
$ifge/2: L $1 $2 J if_false_$$ push_id end
$ifle/2: L $2 $1 J if_false_$$ push_id end
$else/0: J if_false_$$ if_false_pop_id: push_id end
$end/0: if_false_pop_id: end
`;
