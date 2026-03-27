import Link from "next/link";
import SaiIcon from "@/components/ui/SaiIcon";

export const dynamic = "force-dynamic";

export default function OfferPage() {
  return (
    <div className="w-full space-y-4">
      <section className="surface rounded-2xl p-6">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
          <SaiIcon name="file" size={14} />
          Public offer
        </p>
        <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.1em] text-[#14ffec]">Публичная оферта</h1>
        <p className="mt-3 text-sm text-zinc-300">
          Этот документ — шаблон. Перед публикацией заполните реквизиты ИП и проверьте текст с юристом под вашу юрисдикцию и
          схему оказания услуг.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/" className="rounded-lg border border-[#323232] bg-[#212121] px-4 py-2 text-sm text-zinc-200 hover:text-[#14ffec]">
            На главную
          </Link>
          <Link
            href="/tournaments"
            className="rounded-lg border border-[#323232] bg-[#323232] px-4 py-2 text-sm text-zinc-200 hover:text-[#14ffec]"
          >
            К турнирам
          </Link>
        </div>
      </section>

      <article className="surface rounded-2xl p-6 space-y-4 text-sm text-zinc-300">
        <h2 className="text-lg font-bold text-zinc-100">1. Термины</h2>
        <p>
          <b>Платформа</b> — сайт Lethal Line. <b>Организатор</b> — ИП, размещающий турниры. <b>Пользователь</b> — лицо,
          использующее платформу. <b>Заявка</b> — заявка команды на участие в турнире. <b>Взнос</b> — плата за рассмотрение
          заявки и/или участие в турнире.
        </p>

        <h2 className="text-lg font-bold text-zinc-100">2. Предмет оферты</h2>
        <p>
          Организатор предлагает Пользователю подать заявку команды на участие в турнире на Платформе. Для платных турниров
          Пользователь оплачивает Взнос в размере, указанном на странице подачи заявки.
        </p>

        <h2 className="text-lg font-bold text-zinc-100">3. Порядок оплаты</h2>
        <p>
          Оплата производится через платёжную форму Т‑Банка. Сумма Взноса указывается в рублях РФ. Моментом оплаты считается
          поступление подтверждения успешного платежа.
        </p>

        <h2 className="text-lg font-bold text-zinc-100">4. Модерация заявок</h2>
        <p>
          После оплаты заявка поступает на модерацию Организатору. Организатор вправе <b>принять</b> или <b>отклонить</b>{" "}
          заявку, исходя из правил турнира, заполненности слотов и иных критериев, указанных в описании турнира.
        </p>

        <h2 className="text-lg font-bold text-zinc-100">5. Возврат средств</h2>
        <p>
          Если Организатор отклоняет заявку на платный турнир, Платформа инициирует автоматический возврат Взноса тем же
          способом оплаты. Сроки зачисления возврата зависят от банка-эмитента карты/платёжного инструмента.
        </p>
        <p>
          Если возврат не удалось выполнить автоматически (технический сбой, ограничения банка и т.п.), Организатор свяжется с
          Пользователем по доступным контактам для урегулирования возврата.
        </p>

        <h2 className="text-lg font-bold text-zinc-100">6. Ответственность</h2>
        <p>
          Платформа не несёт ответственность за невозможность участия, вызванную действиями Пользователя, нарушением правил
          турнира, форс-мажором, а также за сроки обработки транзакций банками и платёжными системами.
        </p>

        <h2 className="text-lg font-bold text-zinc-100">7. Реквизиты и контакты Организатора</h2>
        <p>
          Укажите реквизиты ИП: ФИО, ИНН, ОГРНИП, адрес, банковские реквизиты, контактный email/телефон.
        </p>
      </article>
    </div>
  );
}

